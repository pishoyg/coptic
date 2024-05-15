/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#include "bookedit.h"
#include "ui_bookedit.h"


MBookEdit::MBookEdit(int cid,QString const & cname,int scr, int lang,short type,short itype,int bid,QString const & bname,QString const & lname,CMessages * const messages,QWidget *parent) :
        QWidget(parent),
        ui(new Ui::MBookEdit),
        messages(messages),
        l_id(lang),
        b_id(bid),
        c_id(cid),
        s_id(scr)
{
    ui->setupUi(this);

    ui->lblIdB->setText(" ID: "+QString::number(b_id)+" ");
    ui->lblIdC->setText(" ID: "+QString::number(c_id)+" ");
    ui->lblIdLang->setText(" ID: "+QString::number(l_id)+" ");

    ui->txtNameB->setText(bname);
    ui->txtNameC->setText(cname);
    ui->txtLang->setText(lname);

    ui->cmbInput->addItem("utf8",(short)1);
    ui->cmbInput->addItem("betacode",(short)2);
    ui->cmbInput->addItem("latin",(short)3);

    ui->cmbIndex->addItem("simple",(short)1);
    ui->cmbIndex->addItem("double",(short)2);

    ui->cmbInput->setCurrentIndex(ui->cmbInput->findData(type));
    ui->cmbIndex->setCurrentIndex(ui->cmbIndex->findData(itype));

    for(unsigned int x=0;x<0xffff;x+=0xff)
        ui->cmbUtf1->addItem("0x"+QString::number(x,16),x);

    CTranslit::Script sc((CTranslit::Script)s_id);
    struct beta * bns,* b(beta_p(sc,&bns));
    for(struct beta * bp=b;bp->utf!=0;bp++)
        ui->cmbBeta->addItem(QString(QString(bp->beta)+" - 0x"+QString::number(bp->utf,16)+" - "+CTranslit::betaToUtf(QString(bp->beta),sc)),QString(bp->beta));

    for(struct beta * bp=bns;bp->utf!=0;bp++)
        ui->cmbBeta->addItem(QString(QString(bp->beta)+" - 0x"+QString::number(bp->utf,16)+" - "+CTranslit::betaToUtf(QString(bp->beta),sc)),QString(bp->beta));

    checkChapter0();
    getChapters(First);

    IC_SIZES
}

MBookEdit::~MBookEdit()
{
    delete ui;
}

void MBookEdit::on_btRefreshL_clicked()
{
    QString query("select `name` from `library_lang` where `id`="+QString::number(l_id));
    MQUERY_GETFIRST(q,query)

    ui->txtLang->setText(q.value(0));

    messages->MsgOk();
}

void MBookEdit::on_btUpdateL_clicked()
{
    QString query("update `library_lang` set `name`='"+ui->txtLang->text().trimmed()+"' where `id`="+QString::number(l_id));
    MQUERY(q,query)
    messages->MsgInf(tr("updated, it is necessary to refresh mysql library"));
    messages->MsgOk();
}

void MBookEdit::on_btRefreshB_clicked()
{
    QString query("select `name`,`ord` from `library_book` where `id`="+QString::number(b_id));
    MQUERY_GETFIRST(q,query)

    ui->txtNameB->setText(q.value(0));
    ui->spnPosBook->setValue(q.value(1).toInt());

    messages->MsgOk();
}

void MBookEdit::on_btWriteB_clicked()
{
    QString query("update `library_book` set `name`='"+ui->txtNameB->text().trimmed()+"',`ord`="+QString::number(ui->spnPosBook->value())+" where `id`="+QString::number(b_id));
    MQUERY(q,query)
    messages->MsgInf(tr("updated, it is necessary to refresh mysql library"));
    messages->MsgOk();
}

void MBookEdit::on_btRefreshC_clicked()
{
    QString query("select `name`,`format`,`spec_index` from `library_collection` where `id`="+QString::number(c_id));
    MQUERY_GETFIRST(q,query)

    ui->txtNameC->setText(q.value(0));
    ui->cmbInput->setCurrentIndex(ui->cmbInput->findData(q.value(1).toShort()));
    ui->cmbIndex->setCurrentIndex(ui->cmbIndex->findData(q.value(2).toShort()));

    messages->MsgOk();
}

void MBookEdit::on_btUpdateC_clicked()
{
    QString query("update `library_collection` set `name`='"+ui->txtNameC->text().trimmed()+"',`format`="+ui->cmbInput->itemData(ui->cmbInput->currentIndex()).toString()+",`spec_index`="+ui->cmbIndex->itemData(ui->cmbIndex->currentIndex()).toString()+" where `id`="+QString::number(c_id));
    MQUERY(q,query)
    messages->MsgInf(tr("updated, it is necessary to refresh mysql library"));
    messages->MsgOk();
}

void MBookEdit::on_btRefreshV_clicked()
{
    QString query("select `text` from `library` where `book`="+QString::number(b_id)+" and `chapter`="+QString::number(ui->spnChapter->value())+" and `verse`="+QString::number(ui->spnVerse->value()));
    MQUERY_GETFIRST(q,query)
    if(!q.isNULL(0))
    {
        ui->txtEdit->setPlainText(q.value(0));
        ui->btUpdateV->setEnabled(false);
    }
    messages->MsgOk();
}

void MBookEdit::on_btUpdateV_clicked()
{
    QString query("update `library` set `text`='"+ui->txtEdit->toPlainText().trimmed()+"' where `book`="+QString::number(b_id)+" and `chapter`="+QString::number(ui->spnChapter->value())+" and `verse`="+QString::number(ui->spnVerse->value()));
    MQUERY(q,query)
    ui->btUpdateV->setEnabled(false);
    messages->MsgOk();
}

void MBookEdit::on_spnChapter_valueChanged(int v)
{
    QString query("select min(`verse`),max(`verse`) from `library` where `book`="+QString::number(b_id)+" and `chapter`="+QString::number(v));
    MQUERY_GETFIRST(q,query)

    if(!q.isNULL(0))
    {
        ui->spnVerse->setEnabled(true);
        ui->spnVerse->setMinimum(q.value(0).toInt());
        ui->spnVerse->setMaximum(q.value(1).toInt());
        ui->lblVe->setText(QString::number(ui->spnVerse->minimum())+"-"+QString::number(ui->spnVerse->maximum()));
        ui->spnVerse->setValue(ui->spnVerse->minimum());
        on_spnVerse_valueChanged(ui->spnVerse->value());
        checkVerse0();
    }
    else
    {
        ui->spnVerse->setEnabled(false);
        ui->spnVerse->setMinimum(0);
        ui->spnVerse->setMaximum(0);
    }
}

void MBookEdit::on_spnVerse_valueChanged(int v)
{
    QString query("select `text` from `library` where `book`="+QString::number(b_id)+" and `chapter`="+QString::number(ui->spnChapter->value())+" and `verse`="+QString::number(v));
    MQUERY_GETFIRST(q,query)

    if(!q.isNULL(0))
    {
        ui->txtEdit->setPlainText(q.value(0));
        ui->btUpdateV->setEnabled(false);
    }

    messages->MsgOk();
}

void MBookEdit::getChapters(Pos pos,int exact)
{
    QString query("select min(`chapter`),max(`chapter`) from `library` where `book`="+QString::number(b_id));
    MQUERY_GETFIRST(q,query)

    if(!q.isNULL(0))
    {
        ui->spnChapter->setEnabled(true);
        ui->spnChapter->setMinimum(q.value(0).toInt());
        ui->spnChapter->setMaximum(q.value(1).toInt());
        ui->lblCh->setText(QString::number(ui->spnChapter->minimum())+"-"+QString::number(ui->spnChapter->maximum()));
        switch(pos)
        {
        case First :
            ui->spnChapter->setValue(ui->spnChapter->minimum());
            break;
        case Last :
            ui->spnChapter->setValue(ui->spnChapter->maximum());
            break;
        case Exact :
            ui->spnChapter->setValue(exact);
            break;
        }

        on_spnChapter_valueChanged(ui->spnChapter->value());
    }
    else
    {
        ui->spnChapter->setEnabled(false);
        ui->spnChapter->setMinimum(0);
        ui->spnChapter->setMaximum(0);
        messages->MsgWarn("book is empty");
    }
    messages->MsgOk();
}

void MBookEdit::on_btInsCh_clicked()
{
    QString query("update `library` set `chapter`=`chapter`+1 where `book`="+QString::number(b_id)+" and `chapter`>="+QString::number(ui->spnChapter->value()));
    QString query2("insert into `library` (`book`,`chapter`,`verse`,`text`) values ("+QString::number(b_id)+","+QString::number(ui->spnChapter->value())+",1,'initial verse of inserted chapter')");
    MQUERY(q,query)
    MQUERY(q2,query2)

    getChapters(Exact,ui->spnChapter->value());
    messages->MsgOk();
}

void MBookEdit::on_btInsV_clicked()
{
    QString query("update `library` set `verse`=`verse`+1 where `book`="+QString::number(b_id)+" and `chapter`="+QString::number(ui->spnChapter->value())+" and `verse`>="+QString::number(ui->spnVerse->value()));
    QString query2("insert into `library` (`book`,`chapter`,`verse`,`text`) values ("+QString::number(b_id)+","+QString::number(ui->spnChapter->value())+","+QString::number(ui->spnVerse->value())+",'inserted verse')");
    MQUERY(q,query)
    MQUERY(q2,query2)

    on_spnChapter_valueChanged(ui->spnChapter->value());
    ui->spnVerse->setValue(ui->spnVerse->value());

    messages->MsgOk();
}

void MBookEdit::on_btAppCh_clicked()
{
    QString query("insert into `library` (`book`,`chapter`,`verse`,`text`) values ("+QString::number(b_id)+","+QString::number(ui->spnChapter->maximum()+1)+",1,'initial verse of appended chapter')");
    MQUERY(q,query);
    getChapters(Last);
    messages->MsgOk();
}

void MBookEdit::on_btAppV_clicked()
{
    QString query("insert into `library` (`book`,`chapter`,`verse`,`text`) values ("+QString::number(b_id)+","+QString::number(ui->spnChapter->value())+","+QString::number(ui->spnVerse->maximum()+1)+",'appended verse')");
    MQUERY(q,query);

    on_spnChapter_valueChanged(ui->spnChapter->value());
    ui->spnVerse->setValue(ui->spnVerse->maximum());
    //on_spnVerse_valueChanged(ui->spnVerse->value());
    messages->MsgOk();
}

void MBookEdit::on_txtEdit_textChanged()
{
    if(!ui->btUpdateV->isEnabled())
        ui->btUpdateV->setEnabled(true);

    QString displayed_text(ui->txtEdit->toPlainText().trimmed());
    switch(ui->cmbInput->itemData(ui->cmbInput->currentIndex()).toInt())
    {
        case 3 :
            switch((CTranslit::Script)s_id)
            {
                case CTranslit::Latin :
                displayed_text=CTranslit::tr(displayed_text,CTranslit::LatinTrToLatinN,false,CTranslit::RemoveNone);
                break;
                case CTranslit::Greek :
                displayed_text=CTranslit::tr(displayed_text,CTranslit::GreekTrToGreekN,false,CTranslit::RemoveNone);
                break;
                case CTranslit::Copt :
                displayed_text=CTranslit::tr(displayed_text,CTranslit::CopticTrToCopticN,false,CTranslit::RemoveNone);
                break;
                case CTranslit::Hebrew :
                displayed_text=CTranslit::tr(displayed_text,CTranslit::HebrewTrToHebrewN,false,CTranslit::RemoveNone);
                break;
            }
            break;
        case 1 :
        {
            //displayed_text=ui->txtEdit->toPlainText().trimmed();
            break;
        }
        case 2 :
        {
            displayed_text=CTranslit::betaToUtf(displayed_text,(CTranslit::Script)s_id);
            break;
        }
    }
    ui->txtPreview->setText(displayed_text);
}

void MBookEdit::on_btDelCh_clicked()
{
    int c(ui->spnChapter->value());
    QString query("delete from `library` where `book`="+QString::number(b_id)+" and `chapter`="+QString::number(c));
    MQUERY(q,query)
    QString query2("update `library` set `chapter`=`chapter`-1 where `book`="+QString::number(b_id)+" and `chapter`>"+QString::number(c));
    MQUERY(q2,query2)
    getChapters(Exact,c);
    if(ui->spnChapter->maximum()>=c)
        ui->spnChapter->setValue(c);
    else
        ui->spnChapter->setValue(ui->spnVerse->maximum());
    messages->MsgOk();
}

void MBookEdit::on_btDelV_clicked()
{
    int c(ui->spnVerse->value());
    QString query("delete from `library` where `book`="+QString::number(b_id)+" and `chapter`="+QString::number(ui->spnChapter->value())+" and `verse`="+QString::number(c));
    MQUERY(q,query)
    QString query2("update `library` set `verse`=`verse`-1 where `book`="+QString::number(b_id)+" and `chapter`="+QString::number(ui->spnChapter->value())+" and `verse`>"+QString::number(c));
    MQUERY(q2,query2)
    on_spnChapter_valueChanged(ui->spnChapter->value());
    if(ui->spnVerse->maximum()>=c)
        ui->spnVerse->setValue(c);
    else
        ui->spnVerse->setValue(ui->spnVerse->maximum());
    messages->MsgOk();
}

void MBookEdit::on_cmbfEdit_currentFontChanged(QFont f)
{
    f.setPointSize(ui->spnfEdit->value());
    ui->txtEdit->setFont(f);
}

void MBookEdit::on_cmbfPrev_currentFontChanged(QFont f)
{
    f.setPointSize(ui->spnfPrev->value());
    ui->txtPreview->setFont(f);
}

void MBookEdit::on_spnfEdit_valueChanged(int v)
{
    QFont f(ui->cmbfEdit->currentFont());
    f.setPointSize(v);
    ui->txtEdit->setFont(f);
    ui->stwKeyb->setFont(f);
}

void MBookEdit::on_spnfPrev_valueChanged(int v)
{
    QFont f(ui->cmbfPrev->currentFont());
    f.setPointSize(v);
    ui->txtPreview->setFont(f);
}

void MBookEdit::on_btZeroV_clicked(bool checked)
{
    if(!checked)
    {
        QString query("delete from `library` where `book`="+QString::number(b_id)+" and `chapter`="+QString::number(ui->spnChapter->value())+" and `verse`=0");
        MQUERY(q,query)
        messages->MsgOk();
        on_spnChapter_valueChanged(ui->spnChapter->value());
    }
    else
    {
        if(!checkVerse0(false))
        {
            QString query("insert into `library` (`book`,`chapter`,`verse`,`text`) values ("+QString::number(b_id)+","+QString::number(ui->spnChapter->value())+",0,'verse 0')");
            MQUERY(q,query)
            messages->MsgOk();
            on_spnChapter_valueChanged(ui->spnChapter->value());
        }
        else
            messages->MsgWarn("verse 0 already exists");
    }
}

void MBookEdit::on_btZeroC_clicked(bool checked)
{
    if(!checked)
    {
        QString query("delete from `library` where `book`="+QString::number(b_id)+" and `chapter`=0");
        MQUERY(q,query)
        messages->MsgOk();
        getChapters(First);
    }
    else
    {
        if(!checkChapter0(false))
        {
            QString query("insert into `library` (`book`,`chapter`,`verse`,`text`) values ("+QString::number(b_id)+",0,1,'initial verse of chapter 0')");
            MQUERY(q,query)
            messages->MsgOk();
            getChapters(First);
        }
        else
            messages->MsgWarn("chapter 0 already exists");
    }
}

bool MBookEdit::checkChapter0(bool button)
{
    QString query("select count(`chapter`) from `library` where `book`="+QString::number(b_id)+" and `chapter`=0");
    MQUERY_GETFIRST_RF(q,query)

    bool b(q.value(0).toInt()>0);
    if(button)
        ui->btZeroC->setChecked(b);
    messages->MsgOk();

    return b;
}

bool MBookEdit::checkVerse0(bool button)
{
    QString query("select count(`verse`) from `library` where `book`="+QString::number(b_id)+" and `chapter`="+QString::number(ui->spnChapter->value())+" and `verse`=0");
    MQUERY_GETFIRST_RF(q,query)

    bool b(q.value(0).toInt()>0);
    if(button)
        ui->btZeroV->setChecked(b);
    messages->MsgOk();

    return b;
}

void MBookEdit::on_cmbUtf1_currentIndexChanged(int index)
{
    if(index>=0)
    {
        ui->cmbUtf2->clear();
        unsigned int y=ui->cmbUtf1->itemData(index).toUInt();
        for(unsigned int x=y;x<=y+0xff;x++)
            ui->cmbUtf2->addItem("0x"+QString::number(x,16)+" - "+QString(x),x);
    }
}

void MBookEdit::on_cmbInput_currentIndexChanged(int index)
{
    switch(index)
    {
    case 0 :
        ui->stwKeyb->setCurrentIndex(0);
        ui->stwKeyb->show();
        break;
    case 1 :
        ui->stwKeyb->setCurrentIndex(1);
        ui->stwKeyb->show();
        break;
    default :
        ui->stwKeyb->hide();
        break;
    }
}

void MBookEdit::on_btInsUtf_clicked()
{
    ui->txtEdit->insertPlainText(QString(ui->cmbUtf2->itemData(ui->cmbUtf2->currentIndex()).toInt()));
}

void MBookEdit::on_btInsBeta_clicked()
{
    ui->txtEdit->insertPlainText(ui->cmbBeta->itemData(ui->cmbBeta->currentIndex()).toString());
}
