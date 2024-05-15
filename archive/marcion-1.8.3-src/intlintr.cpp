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

#include "intlintr.h"
#include "ui_intlintr.h"

QString CIntLinTr::tmpl1("<tr style=\"color: (*itemfg*); background-color: (*itembg*);\"><td style=\"text-align: center; vertical-align: middle;\">(*cword*)</td><td style=\"text-align: center; vertical-align: middle;\">(*leqv*)</td><td style=\"text-align: center; vertical-align: middle;\"><a href=\"(*web*)(*id*)\" target=\"_blank\">(*id*)</a></td><td style=\"text-align: center; vertical-align: middle;\">(*cworde*)</td><td style=\"text-align: center; vertical-align: middle;\">(*leqve*)</td><td style=\"text-align: center; vertical-align: middle;\"><a href=\"(*web*)(*ide*)\" target=\"_blank\">(*ide*)</a></td></tr>");
QString CIntLinTr::tmpl2("<table style=\"color: (*tblfg*); background-color: (*tblbg*); text-align: left; width: 100%;\" border=\"1\" cellpadding=\"5\" cellspacing=\"1\"><tbody><tr><td colspan=\"3\" style=\"color: (*hdrfg*); background-color: (*hdrbg*); text-align: center; vertical-align: middle;\">(*prep*)</td></tr>(*rows*)<tr><td colspan=\"6\" style=\"color: (*txtfg*); background-color: (*txtbg*); text-align: center; vertical-align: middle;\"><big>(*transczen*)</big></td></tr><tr><td colspan=\"6\" style=\"background-color: (*commbg*); color: (*commfg*); text-align: left; vertical-align: middle;\">(*app*)</td></tr></tbody></table><br>");

CIntLinTr::CIntLinTr(CMessages * const messages,bool is_new,QWidget *parent) :
    QWidget(parent),
    ui(new Ui::CIntLinTr),
    messages(messages),
    table_is_init(!is_new),
    _keyb_menu(0),
    popup(),ppblock(tr("&block"))
{
    ui->setupUi(this);

    a_mark_gr=popup.addAction(tr("(un)&mark as greek"));
    a_mark_gr->setShortcut(QKeySequence("Ctrl+Alt+G"));
    a_qmark=popup.addAction(tr("(un)m&ark as (?)"));
    a_qmark->setShortcut(QKeySequence("Ctrl+Alt+M"));
    a_extword=popup.addAction(tr("&new extra word"));
    a_extword->setShortcut(QKeySequence("Ctrl+Alt+W"));
    a_rmextword=popup.addAction(tr("&remove extra word"));
    a_convert=popup.addAction(tr("&convert"));
    a_clean_one=popup.addAction(tr("c&lean"));
    a_clean=popup.addAction(tr("cl&ean all"));
    popup.addSeparator();
    a_crum=popup.addAction(tr("&open dictionary"));
    popup.addSeparator();
    a_dropcol=popup.addAction(tr("&delete column"));
    a_dropcol->setShortcut(QKeySequence("Ctrl+Alt+Del"));
    a_inscola=popup.addAction(tr("in&sert column before"));
    a_inscola->setShortcut(QKeySequence("Ctrl+Alt+Ins"));
    a_inscolb=popup.addAction(tr("inser&t column after"));
    a_inscolb->setShortcut(QKeySequence("Ctrl+Shift+Ins"));
    popup.addSeparator();
    a_copy=popup.addAction(tr("co&py text"));
    a_copy->setShortcut(QKeySequence("Ctrl+Alt+C"));
    a_cpcnv=popup.addAction(tr("con&vert + copy"));
    a_cpcnv->setShortcut(QKeySequence("Ctrl+Shift+C"));
    a_paste=popup.addAction(tr("paste te&xt"));
    a_paste->setShortcut(QKeySequence("Ctrl+Alt+V"));

    a_ctbl=ppblock.addAction(tr("&cut"));
    a_ctbl->setShortcut(QKeySequence("Ctrl+Meta+X"));
    a_cpbl=ppblock.addAction(tr("c&opy"));
    a_cpbl->setShortcut(QKeySequence("Ctrl+Meta+C"));
    a_psbl=ppblock.addAction(tr("&paste before"));
    a_psbl->setShortcut(QKeySequence("Ctrl+Meta+B"));
    a_psbla=ppblock.addAction(tr("p&aste after"));
    a_psbla->setShortcut(QKeySequence("Ctrl+Meta+V"));
    a_rmbl=ppblock.addAction(tr("&remove"));
    a_rmbl->setShortcut(QKeySequence("Ctrl+Meta+Del"));

    popup.addMenu(&ppblock);

    a_printbl=popup.addAction(tr("pr&int clipboard"));

    /*if(is_new)
        ui->btReadDb->setEnabled(false);*/
    ui->txtFinal->setPlainText("<english></english>\n<czech></czech>");
    ui->txtAppend->setPlainText("<english>\n</english>\n<czech>\n</czech>");
}

CIntLinTr::~CIntLinTr()
{
    delete ui;
}

void CIntLinTr::changeEvent(QEvent *e)
{
    QWidget::changeEvent(e);
    switch (e->type()) {
    case QEvent::LanguageChange:
        ui->retranslateUi(this);
        break;
    default:
        break;
    }
}

void CIntLinTr::keyPressEvent(QKeyEvent * event)
{
    event->ignore();

    if(event->modifiers()==(Qt::ControlModifier+Qt::MetaModifier))
    {
        switch(event->key())
        {
        case Qt::Key_X :
            event->accept();
            _keyb_menu=a_ctbl;
            on_tblInter_customContextMenuRequested(QPoint());
            break;
        case Qt::Key_C :
            event->accept();
            _keyb_menu=a_cpbl;
            on_tblInter_customContextMenuRequested(QPoint());
            break;
        case Qt::Key_V :
            event->accept();
            _keyb_menu=a_psbl;
            on_tblInter_customContextMenuRequested(QPoint());
            break;
        case Qt::Key_B :
            event->accept();
            _keyb_menu=a_psbla;
            on_tblInter_customContextMenuRequested(QPoint());
            break;
        case Qt::Key_Delete :
            event->accept();
            _keyb_menu=a_rmbl;
            on_tblInter_customContextMenuRequested(QPoint());
            break;
        }
    }

    if(event->modifiers()==(Qt::ControlModifier+Qt::ShiftModifier))
    {
        switch(event->key())
        {
        case Qt::Key_C :
            event->accept();
            _keyb_menu=a_cpcnv;
            on_tblInter_customContextMenuRequested(QPoint());
            break;
        case Qt::Key_Insert :
            event->accept();
            _keyb_menu=a_inscolb;
            on_tblInter_customContextMenuRequested(QPoint());
            break;
        }
    }

    if(event->modifiers()==(Qt::ControlModifier+Qt::AltModifier))
    {
        switch(event->key())
        {
        case Qt::Key_V :
            event->accept();
            _keyb_menu=a_paste;
            on_tblInter_customContextMenuRequested(QPoint());
            break;
        case Qt::Key_C :
            event->accept();
            _keyb_menu=a_copy;
            on_tblInter_customContextMenuRequested(QPoint());
            break;
        case Qt::Key_Insert :
            event->accept();
            _keyb_menu=a_inscola;
            on_tblInter_customContextMenuRequested(QPoint());
            break;
        case Qt::Key_Delete :
            event->accept();
            _keyb_menu=a_dropcol;
            on_tblInter_customContextMenuRequested(QPoint());
            break;
        case Qt::Key_G :
            event->accept();
            _keyb_menu=a_mark_gr;
            on_tblInter_customContextMenuRequested(QPoint());
            break;
        case Qt::Key_M :
            event->accept();
            _keyb_menu=a_qmark;
            on_tblInter_customContextMenuRequested(QPoint());
            break;
        case Qt::Key_W :
            event->accept();
            _keyb_menu=a_extword;
            on_tblInter_customContextMenuRequested(QPoint());
            break;

        }
    }

    if(!event->isAccepted())
        QWidget::keyPressEvent(event);
}

void CIntLinTr::on_btCreate_clicked()
{
    QString rawt(ui->txtRaw->toPlainText());
    rawt.remove("\n");
    QStringList sl(rawt.split(ui->cmbSep->currentText(),QString::KeepEmptyParts));
    initTbl(sl.count());

    for(int x=0;x<sl.count();x++)
        setTbl(x,sl[x],QString(),QString(),false);

    finalizeTbl();
    ui->btReadDb->setEnabled(true);
    table_is_init=true;
}

void CIntLinTr::setFonts(QFont coptic,QFont latin)
{
    cop=coptic;
    lat=latin;
    ui->txtRaw->setFont(cop);
    ui->txtPrep->setFont(lat);
    ui->txtFinal->setFont(lat);
    ui->txtAppend->setFont(lat);
    ui->tblInter->setFont(lat);
}

QString CIntLinTr::asHtml(Transl transl,QString & enttxt,QString & enttrans,bool links_to_www,QString * simptr,QString * simpc) const
{
    QStringList sl;

    int langrow(transl==English?0:1);
    QString const  target(links_to_www?"http://marcion.sourceforge.net/view.php?id=":QString());
    enttxt.append("<br>"+ui->txtPrep->text().trimmed()+" ");
    for(int x=0;x<ui->tblInter->columnCount();x++)
    {
        QString nr(tmpl1),cw(ui->tblInter->item(0,x)->text());

        nr.replace("(*cword*)",cw);

        CTranslItem * tri1((CTranslItem*)ui->tblInter->cellWidget(1+langrow,x));

        nr.replace("(*leqv*)",tri1->selectedWord());

        QString wid(cleanId(tri1->coptDictId().remove(QRegExp("\\ \\/.*$"))));
        enttxt.append(cw+"<sub> <a href=\""+target+wid+"\" target=\"_blank\">"+wid+"</a></sub> ");
        nr.replace("(*id*)",wid);
        nr.replace("(*web*)",target);
        sl.append(nr);
    }

    for(int x=0;x<ui->tblInter->columnCount();x++)
    {
        QTableWidgetItem * i(ui->tblInter->item(3,x));
        if(i)
        {
            QString extw(i->text().trimmed());
            if(!extw.isEmpty())
            {
                CTranslItem * tri1((CTranslItem*)ui->tblInter->cellWidget(4+langrow,x));
                //CTranslItem * tri2((CTranslItem*)ui->tblInter->cellWidget(5,x));

                sl[x].replace("(*cworde*)",extw);
                sl[x].replace("(*leqve*)",tri1->selectedWord());
                sl[x].replace("(*ide*)",cleanId(tri1->coptDictId().remove(QRegExp("\\ \\/.*$"))));
                //rs.append(QString(tri2->selectedWord()+"#"+tri2->coptDictId()+"<isep>"));
            }
            else
            {
                sl[x].replace("(*cworde*)",QString());
                sl[x].replace("(*leqve*)",QString());
                sl[x].replace("(*ide*)",QString());
            }
        }
        else
        {
            sl[x].replace("(*cworde*)",QString());
            sl[x].replace("(*leqve*)",QString());
            sl[x].replace("(*ide*)",QString());
        }
        sl[x].replace("(*web*)",target);
    }

    QString ctr,capp;
    switch(transl)
    {
    case Czech :
        {
            QRegExp r("<czech>.*</czech>");
            QString t(ui->txtFinal->toPlainText());
            if(r.indexIn(t)!=-1)
            {
                ctr=r.cap(0);
                ctr.remove(QRegExp("(<czech>|</czech>)"));
                ctr=ctr.trimmed();
            }

            t=ui->txtAppend->toPlainText();
            if(r.indexIn(t)!=-1)
            {
                capp=r.cap(0);
                capp.remove(QRegExp("(<czech>|</czech>)"));
                capp=capp.trimmed();
            }

            break;
        }
    case English :
        {
            QRegExp r("<english>.*</english>");
            QString t(ui->txtFinal->toPlainText());
            if(r.indexIn(t)!=-1)
            {
                ctr=r.cap(0);
                ctr.remove(QRegExp("(<english>|</english>)"));
                ctr=ctr.trimmed();
            }

            t=ui->txtAppend->toPlainText();
            if(r.indexIn(t)!=-1)
            {
                capp=r.cap(0);
                capp.remove(QRegExp("(<english>|</english>)"));
                capp=capp.trimmed();
            }

            break;
        }
    }

    QString t(tmpl2);

    QString prep(ui->txtPrep->text().trimmed());
    if(simptr&&simpc)
    {
        simptr->append("<tr><td>"+prep+"</td><td>"+ctr+"</td></tr>");
        if(!capp.isEmpty())
            simpc->append("<p>"+capp.replace("\n","<br>")+"</p>");
    }

    QRegExp r("^\\([0-9]+/[0-9]+\\)");
    r.setMinimal(true);
    int i(r.indexIn(prep));
    if(i!=-1)
    {
        QString s(r.cap(0));
        //prep.remove(r);
        prep=QString("<a href=\"#e"+s+"\" name=\"p"+s+"\">"+prep+"</a>    <a href=\"#t"+s+"\">tr</a>");

        enttxt.replace(s,QString("<a href=\"#p"+s+"\" name=\"e"+s+"\">"+s+"</a>"));

        /*int beg(enttrans.indexOf(s));
        if(beg!=-1)*/
            enttrans.replace(s,QString("<a href=\"#p"+s+"\" name=\"t"+s+"\">"+s+"</a>"));

    }

    t.replace("(*prep*)",prep);
    t.replace("(*transczen*)",ctr);
    t.replace("(*app*)",capp.replace("\n","<br>"));
    t.replace("(*rows*)",sl.join("\n"));
    t.replace("(*lfontf*)",lat.family());
    t.replace("(*lfonts*)",QString::number(lat.pointSize()));
    t.replace("(*cfontf*)",cop.family());
    t.replace("(*cfonts*)",QString::number(cop.pointSize()));


    return t;
}

QString CIntLinTr::asString() const
{
    QString rs;
    rs.append(ui->txtPrep->text()+"<sep>\n");
    rs.append(ui->txtRaw->toPlainText()+"<sep>\n");

    for(int x=0;x<ui->tblInter->columnCount();x++)
    {
        rs.append(QString(ui->tblInter->item(0,x)->text().trimmed()+"<isep>"));

        CTranslItem * tri1((CTranslItem*)ui->tblInter->cellWidget(1,x));
        CTranslItem * tri2((CTranslItem*)ui->tblInter->cellWidget(2,x));
        rs.append(QString(tri1->selectedWord()+"#"+tri1->coptDictId()+"#"+QString::number(tri1->currentOrigId())+"<isep>"));
        rs.append(QString(tri2->selectedWord()+"#"+tri2->coptDictId()+"#"+QString::number(tri2->currentOrigId())+"<isep>"));
    }


    rs.remove(QRegExp("<isep>$"));
    rs.append("<sep>\n");

    for(int x=0;x<ui->tblInter->columnCount();x++)
    {
        QTableWidgetItem * i(ui->tblInter->item(3,x));
        if(i)
        {
            QString extw(i->text().trimmed());
            if(!extw.isEmpty())
            {
                CTranslItem * tri1((CTranslItem*)ui->tblInter->cellWidget(4,x));
                CTranslItem * tri2((CTranslItem*)ui->tblInter->cellWidget(5,x));
                rs.append(QString(extw+"#"+QString::number(tri1->column())+"#"+QString::number(tri1->extend())+"<isep>"));
                rs.append(QString(tri1->selectedWord()+"#"+tri1->coptDictId()+"<isep>"));
                rs.append(QString(tri2->selectedWord()+"#"+tri2->coptDictId()+"<isep>"));
            }
        }
    }
    rs.remove(QRegExp("<isep>$"));

    rs.append("<sep>\n");
    rs.append(ui->txtFinal->toPlainText()+"<sep>\n");
    rs.append(ui->txtAppend->toPlainText()+"<block>\n");
    return rs;
}

void CIntLinTr::setPrep(QString const & text)
{
    ui->txtPrep->setText(text);
}

void CIntLinTr::setFinal(QString const & text)
{
    ui->txtFinal->setPlainText(text);
}

void CIntLinTr::setRaw(QString const & text)
{
    ui->txtRaw->setPlainText(text);
}

void CIntLinTr::setApp(QString const & text)
{
    if(text.trimmed().isEmpty())
        ui->txtAppend->setPlainText("<english>\n</english>\n<czech>\n</czech>");
    else
        ui->txtAppend->setPlainText(text);
}

QTableWidgetItem * CIntLinTr::setTbl(int column,QString const & coptic, QString const & en, QString const & cz, bool extra,int extend)
{
    int cop_r,en_r,cz_r;
    if(extra)
    {
        cop_r=3;en_r=4;cz_r=5;
        if(ui->tblInter->rowCount()==3)
        {
            ui->tblInter->setRowCount(6);
            QStringList hl;
            hl << tr("coptic") << tr("english") << tr("czech") << tr("coptic-ext") << tr("english-ext") << tr("czech-ext");
            ui->tblInter->setVerticalHeaderLabels(hl);
        }
    }
    else
    {
        cop_r=0;en_r=1;cz_r=2;
    }

    QTableWidgetItem * ti=new QTableWidgetItem();

    ti->setText(coptic.trimmed());
    ti->setFont(cop);

    CTranslItem * cmben=new CTranslItem(CTranslItem::English,lat,column,extra,extend),
    * cmbcz=new CTranslItem(CTranslItem::Czech,lat,column,extra,extend);
    cmben->addItem(en);
    //cmben->setFont(lat);
    cmbcz->addItem(cz);
    //cmbcz->setFont(lat);
    cmben->adjustSize();
    cmbcz->adjustSize();

    ui->tblInter->setCellWidget(en_r,column,cmben);
    ui->tblInter->setCellWidget(cz_r,column,cmbcz);
    ui->tblInter->setItem(cop_r,column,ti);

    adjustOne(column);

    connect(cmben,SIGNAL(refreshRequested(CTranslItem::Lang,int,bool)),this,SLOT(slot_refreshRequested(CTranslItem::Lang,int,bool)));
    connect(cmbcz,SIGNAL(refreshRequested(CTranslItem::Lang,int,bool)),this,SLOT(slot_refreshRequested(CTranslItem::Lang,int,bool)));
    connect(cmben,SIGNAL(wordChanged(CTranslItem::Lang,int,int,bool)),this,SLOT(slot_wordChanged(CTranslItem::Lang,int,int,bool)));
    connect(cmbcz,SIGNAL(wordChanged(CTranslItem::Lang,int,int,bool)),this,SLOT(slot_wordChanged(CTranslItem::Lang,int,int,bool)));

    return ti;
}

void CIntLinTr::initTbl(int columns)
{
    ui->tblInter->clearContents();
    ui->tblInter->setColumnCount(columns);
    ui->tblInter->setRowCount(3);
}

void CIntLinTr::on_btReadDb_clicked()
{
    USE_CLEAN_WAIT
    for(int x=0;x<ui->tblInter->columnCount();x++)
        slot_refreshRequested(CTranslItem::English,x,false);

}

void CIntLinTr::slot_refreshRequested(CTranslItem::Lang,int column,bool extra)
{
    USE_CLEAN_WAIT

    QString cword(ui->tblInter->item(extra?3:0,column)->text());
    cword=CTranslit::tr(cword,CTranslit::CopticNToCopticTr,true,CTranslit::RemoveNone).trimmed();
    while(cword.indexOf("  ")!=-1)
        cword.replace("  "," ");

    messages->MsgMsg(tr("update request: ")+QString::number(column)+tr(" word: ")+cword);

    CTranslItem * ti1((CTranslItem *)ui->tblInter->cellWidget(extra?4:1,column));
    CTranslItem * ti2((CTranslItem *)ui->tblInter->cellWidget(extra?5:2,column));

    int origid(ti1->currentOrigId());

    QString query("select `en_eqv`,`cz_eqv`,concat(case when `crum_table`=3 then concat('3-',`grammar`) when `crum_table` in(1,2) then concat(`crum_table`,'-',`crum_id`) else concat('4-',replace(`name`,'(gk) ','')) end,' / ',`name`),`cop_grp_transl`.`key`,`cop_encz_transl`.`key` from `cop_transl` inner join `cop_grp_transl` on `cop_transl`.`key_group`=`cop_grp_transl`.`key` inner join `cop_encz_transl` on `cop_grp_transl`.`key`=`cop_encz_transl`.`key_group` where replace(`word`,' ','')=replace('"+cword+"',' ','') order by `cop_grp_transl`.`key`,`en_eqv`");
    MQUERY(q,query);

    ti1->clear();
    ti2->clear();
    int lastgkey(-1);
    while(q.next())
    {
        int gkey(q.value(3).toInt());
        QString cid(q.value(2));
        //messages->MsgMsg("gkkey= "+cid);
        if(cid.startsWith("4"))
        {
            int p(cid.indexOf("/"));
            if(p!=-1)
            {
                QString part1(cid.left(p));
                QRegExp r("\\(.*\\)");
                r.setMinimal(true);
                part1.remove(r);
                while(part1.indexOf("  ")!=-1)
                    part1.replace("  "," ");
                part1=part1.trimmed();
                cid=QString(part1+" /"+cid.mid(p+1));
            }
        }

        int uniqid(q.value(4).toInt());
        ti1->addItem2(q.value(0),uniqid,cid,lastgkey!=gkey);
        ti2->addItem2(q.value(1),uniqid,cid,lastgkey!=gkey);

        lastgkey=gkey;
        /*switch(lang)
        {
        case CTranslItem::English :
            ti->addItem(q.value(0));
            break;
        case CTranslItem::Czech :
            ti->addItem(q.value(1));
            break;
        }*/
    }

    ti1->setOrigId(origid);

    /*ti1->adjustSize();
    ti2->adjustSize();*/


    messages->MsgOk();
}

void CIntLinTr::slot_wordChanged(CTranslItem::Lang lang,int column,int index,bool extra)
{
    CTranslItem * ti;
    switch(lang)
    {
    case CTranslItem::English :
        {
            ti=(CTranslItem *)ui->tblInter->cellWidget(extra?5:2,column);
            break;
        }
    case CTranslItem::Czech :
        {
            ti=(CTranslItem *)ui->tblInter->cellWidget(extra?4:1,column);
            break;
        }
    default:
        {
            ti=(CTranslItem *)ui->tblInter->cellWidget(extra?5:2,column);
            break;
        }
    }
    ti->selectItem(index);

    QString s(ui->tblInter->item(extra?3:0,column)->text());
    if(ti->isSelGroupGreek())
    {
        if(!s.startsWith("(gk) "))
        {
            s.prepend("(gk) ");
            ui->tblInter->item(extra?3:0,column)->setText(s);
        }
    }
    else
    {
        if(s.startsWith("(gk) "))
        {
            s.remove(QRegExp("\\(gk\\) "));
            ui->tblInter->item(extra?3:0,column)->setText(s);
        }
    }
    emit changed();
}

void CIntLinTr::on_tblInter_customContextMenuRequested(QPoint )
{
    a_crum->setEnabled(false);
    a_mark_gr->setEnabled(false);
    a_extword->setEnabled(false);
    a_rmextword->setEnabled(false);
    a_clean->setEnabled(false);
    a_convert->setEnabled(false);
    a_qmark->setEnabled(false);
    a_clean_one->setEnabled(false);
    a_copy->setEnabled(false);
    a_paste->setEnabled(false);
    a_cpcnv->setEnabled(false);
    ppblock.setEnabled(false);

    a_ctbl->setEnabled(false);
    a_cpbl->setEnabled(false);
    a_psbl->setEnabled(false);
    a_psbla->setEnabled(false);
    a_rmbl->setEnabled(false);

    a_crum->setText(tr("lookup ( - )"));

    QString crum_id;
    bool greek(false);
    QTableWidgetItem * ci(0);
    if(ui->tblInter->selectedItems().count()>0)
        ci=ui->tblInter->selectedItems().first();
    int r(0),c(0);
    if(ci)
    {
        r=ui->tblInter->row(ci);
        c=ui->tblInter->column(ci);

        switch(r)
        {
        case 0 :
            a_mark_gr->setEnabled(true);
            a_extword->setEnabled(true);
            a_clean->setEnabled(true);
            a_clean_one->setEnabled(true);
            a_qmark->setEnabled(true);
            a_convert->setEnabled(true);
            a_copy->setEnabled(true);
            a_cpcnv->setEnabled(true);
            ppblock.setEnabled(true);

            a_ctbl->setEnabled(true);
            a_cpbl->setEnabled(true);
            a_psbl->setEnabled(true);
            a_psbla->setEnabled(true);
            a_rmbl->setEnabled(true);

            if(!QApplication::clipboard()->text().isEmpty())
                a_paste->setEnabled(true);

            break;
        case 3 :
            a_rmextword->setEnabled(true);
            a_qmark->setEnabled(true);
            a_convert->setEnabled(true);
            a_copy->setEnabled(true);
            a_cpcnv->setEnabled(true);
            if(!QApplication::clipboard()->text().isEmpty())
                a_paste->setEnabled(true);

            break;
        }

        if(r==0||r==3)
        {
            //QString w(ci->text());
           /* if(w.startsWith("(gk) "))
            {
                //w.remove(QRegExp("^\\(gk\\)\\ "));
                crum_id=CTranslit::tr(w,CTranslit::CopticNToGreekTr,true,false);
                greek=true;
                a_crum->setText("lookup ( "+crum_id+" )");
            }
            else
            {*/
                CTranslItem * tri((CTranslItem *)ui->tblInter->cellWidget((r>=3?4:1),c));
                if(tri)
                {
                    crum_id=tri->coptDictId().remove(QRegExp("\\ \\/\\ .*$")).trimmed();
                    a_crum->setText(tr("look&up (")+crum_id+")");
                }
           // }
            greek=ci->text().startsWith("(gk) ");

            a_crum->setEnabled(true);
        }
    }

    QAction * a(0);
    if(_keyb_menu)
    {
        a=_keyb_menu;
        _keyb_menu=0;
        if(!a->isEnabled())
            return;
    }
    else
        a=popup.exec();

    if(a)
    {
        if(a==a_mark_gr)
        {
            if(ui->tblInter->selectedItems().count()>0)
            {
                //QTableWidgetItem * i=ui->tblInter->selectedItems().first();
                QString w(ci->text());
                if(w.startsWith("(gk) "))
                    w.remove(0,5);
                else
                    w.prepend("(gk) ");
                ci->setText(w);
            }
        }
        else if(a==a_convert)
        {
            if(ci)
            {
                QString t(ci->text());
                t=CTranslit::tr(t,CTranslit::CopticTrToCopticN,false,CTranslit::RemoveNone);
                ci->setText(t);
            }
        }
        else if(a==a_qmark)
        {
            //QTableWidgetItem * i=ui->tblInter->itemAt(pos);
            if(ci)
            {
                int r(ci->row());
                if(r==0||r==3)
                {
                    QString t(ci->text());
                    QRegExp r("\\ \\(\\?[1-9]*\\)$");

                    if(r.indexIn(t)!=-1)
                        t.remove(r);
                    else
                        t.append(" (?)");
                    ci->setText(t);
                }
            }
        }
        else if(a==a_extword)
        {
            QString nw;
            int column(-1),extend(0);
            for(int x=0;x<ui->tblInter->selectedItems().count();x++)
            {
                QTableWidgetItem * i=ui->tblInter->selectedItems().at(x);
                if(ui->tblInter->row(i)==0)
                {
                    if(column==-1)
                        column=ui->tblInter->column(i);
                    nw.append(i->text());
                    extend++;
                }
            }
            if(!nw.isEmpty())
                setTbl(column,nw,QString(),QString(),true,extend);
        }
        else if(a==a_rmextword)
        {
            //QTableWidgetItem * i=ui->tblInter->itemAt(pos);
            if(ci)
            {
                int column=ui->tblInter->column(ci);
                if(ui->tblInter->row(ci)==3)
                {
                    ui->tblInter->setItem(3,column,0);
                    ui->tblInter->removeCellWidget(4,column);
                    ui->tblInter->removeCellWidget(5,column);
                }
                bool extw(false);
                for(int x=0;x<ui->tblInter->columnCount();x++)
                {
                    QTableWidgetItem * wi(ui->tblInter->item(3,x));
                    if(wi)
                        if(!wi->text().isEmpty())
                        {
                            extw=true;
                            break;
                        }
                }
                if(!extw)
                    ui->tblInter->setRowCount(3);
                emit changed();
            }
        }
        else if(a==a_clean_one)
        {
            if(ci)
            {
                QString s(CTranslit::tr(ci->text().trimmed(),CTranslit::CopticNToCopticTr,true,CTranslit::RemoveNone));
                ci->setText(CTranslit::tr(s,CTranslit::CopticTrToCopticN,true,CTranslit::RemoveNone));
            }
        }
        else if(a==a_clean)
        {
            for(int x=0;x<ui->tblInter->columnCount();x++)
            {
                QTableWidgetItem * i(ui->tblInter->item(0,x));
                if(i)
                {
                    QString s(CTranslit::tr(i->text().trimmed(),CTranslit::CopticNToCopticTr,true,CTranslit::RemoveNone));
                    i->setText(CTranslit::tr(s,CTranslit::CopticTrToCopticN,true,CTranslit::RemoveNone));
                }
            }
        }
        else if(a==a_crum)
        {
            short tbl(QString(crum_id[0]).toShort());
            if(greek)
            {
                crum_id.remove(0,2);
                emit dictionaryRequested(4,0,crum_id);
            }
            else
            {
                if(tbl==1||tbl==2)
                {
                    crum_id.remove(0,2);
                    int id(crum_id.toInt());
                    emit dictionaryRequested(tbl,id,QString());
                }
                else if(tbl==3)
                {
                    crum_id.remove(0,2);
                    emit grammarRequested(crum_id);
                }
            }
        }
        else if(a==a_dropcol)
        {
            if(ci)
            {
                ui->tblInter->removeColumn(c);
                recalcColumns();
                emit changed();
            }
        }
        else if(a==a_inscolb)
        {
            if(ci)
            {
                ui->tblInter->insertColumn(c+1);
                setTbl(c+1,QString(),QString(),QString(),false);
                recalcColumns();
            }
        }
        else if(a==a_inscola)
        {
            if(ci)
            {
                ui->tblInter->insertColumn(c);
                setTbl(c,QString(),QString(),QString(),false);
                recalcColumns();
            }
        }
        else if(a==a_copy)
        {
            if(ci)
                QApplication::clipboard()->setText(ci->text());
        }
        else if(a==a_cpcnv)
        {
            if(ci)
                QApplication::clipboard()->setText(CTranslit::tr(ci->text(),CTranslit::CopticNToCopticTr,false,CTranslit::RemoveNone));
        }
        else if(a==a_paste)
        {
            if(ci)
                ci->setText(QApplication::clipboard()->text());
        }
        else if(a==a_cpbl)
        {
            QList<QTableWidgetItem *> it(ui->tblInter->selectedItems());
            QStringList data;

            for(int x=0;x<it.count();x++)
            {
                QTableWidgetItem * i(it.at(x));
                if(i)
                {
                    if(i->row()==0)
                        data.append(i->text());
                }
            }
            emit clipboardData(&data,false);
        }
        else if(a==a_ctbl)
        {
            QList<QTableWidgetItem *> it(ui->tblInter->selectedItems());
            QStringList data;

            int const c(it.count());
            for(int x=0;x<c;x++)
            {
                QTableWidgetItem * i(it.at(x));
                if(i)
                {
                    if(i->row()==0)
                        data.append(i->text());
                }
            }

            if(!data.isEmpty())
            {
                QList<QTableWidgetSelectionRange> lrng(ui->tblInter->selectedRanges());
                if(lrng.count()>0)
                {
                    QTableWidgetSelectionRange rng(lrng.at(0));
                    int const lc(rng.leftColumn());
                    for(int x=0;x<rng.columnCount();x++)
                        ui->tblInter->removeColumn(lc);
                    recalcColumns();
                    emit changed();
                    emit clipboardData(&data,false);
                }
            }
        }
        else if(a==a_psbl)
        {
            QStringList data;
            emit clipboardData(&data,true);

            if(ci&&!data.isEmpty())
            {
                for(int x=data.count();x>0;x--)
                {
                    ui->tblInter->insertColumn(c);
                    setTbl(c,data.at(x-1),QString(),QString(),false);
                }
                recalcColumns();
            }
        }
        else if(a==a_psbla)
        {
            QStringList data;
            emit clipboardData(&data,true);

            if(ci&&!data.isEmpty())
            {
                for(int x=data.count();x>0;x--)
                {
                    ui->tblInter->insertColumn(c+1);
                    setTbl(c+1,data.at(x-1),QString(),QString(),false);
                }
                recalcColumns();
            }
        }
        else if(a==a_rmbl)
        {
            QList<QTableWidgetSelectionRange> lrng(ui->tblInter->selectedRanges());
            if(lrng.count()>0)
            {
                QTableWidgetSelectionRange rng(lrng.at(0));
                int const lc(rng.leftColumn());
                for(int x=0;x<rng.columnCount();x++)
                    ui->tblInter->removeColumn(lc);
                recalcColumns();
                emit changed();
            }
        }
        else if(a==a_printbl)
        {
            QStringList l;
            emit clipboardData(&l,true);
            if(l.isEmpty())
                messages->MsgMsg(tr("clipboard is empty"));
            else
                messages->MsgMsg(tr("content of clipboard:\n")+l.join(" | "));
        }
    }
}

void CIntLinTr::on_btRmNewlines_clicked()
{
    QString ct(ui->txtRaw->toPlainText().trimmed());
    ct.remove("\n");
    while(ct.indexOf("  ")!=-1)
        ct.replace("  "," ");
    ui->txtRaw->setPlainText(ct);
}

void CIntLinTr::on_btAdjust_clicked()
{
    ui->tblInter->resizeColumnsToContents();
    ui->tblInter->resizeRowsToContents();
}

void CIntLinTr::adjustOne(int column)
{
    ui->tblInter->resizeColumnToContents(column);
}

void CIntLinTr::finalizeTbl()
{
    ui->tblInter->resizeRowsToContents();
}

void CIntLinTr::on_cbHHeader_toggled(bool checked)
{
    ui->tblInter->horizontalHeader()->setVisible(checked);
}

QString CIntLinTr::getFinal(Transl transl) const
{
    QString ctr;
    switch(transl)
    {
    case Czech :
        {
            QRegExp r("<czech>.*</czech>");
            QString t(ui->txtFinal->toPlainText());
            if(r.indexIn(t)!=-1)
            {
                ctr=r.cap(0);
                ctr.remove(QRegExp("(<czech>|</czech>)"));
                ctr=ctr.trimmed();
            }

            break;
        }
    case English :
        {
            QRegExp r("<english>.*</english>");
            QString t(ui->txtFinal->toPlainText());
            if(r.indexIn(t)!=-1)
            {
                ctr=r.cap(0);
                ctr.remove(QRegExp("(<english>|</english>)"));
                ctr=ctr.trimmed();
            }

            break;
        }
    }
    return QString("<tr><td>"+ui->txtPrep->text().trimmed()+"</td><td>"+ctr+"</td></tr>");
}

void CIntLinTr::recalcColumns()
{
    for(int x=0;x<ui->tblInter->columnCount();x++)
    {
        CTranslItem * i1((CTranslItem *)ui->tblInter->cellWidget(1,x));
        CTranslItem * i2((CTranslItem *)ui->tblInter->cellWidget(2,x));
        if(i1)
            i1->setColumn(x);
        if(i2)
            i2->setColumn(x);

        CTranslItem * i3((CTranslItem *)ui->tblInter->cellWidget(4,x));
        CTranslItem * i4((CTranslItem *)ui->tblInter->cellWidget(5,x));
        if(i3)
            i3->setColumn(x);
        if(i4)
            i4->setColumn(x);
    }
}

void CIntLinTr::on_btCnvText_clicked()
{
    QString t(ui->txtRaw->toPlainText());
    ui->txtRaw->setText(CTranslit::tr(t,CTranslit::CopticTrToCopticN,false,CTranslit::RemoveNone));
}

void CIntLinTr::on_btCrLink_clicked()
{
    QString s(ui->txtFinal->textCursor().selectedText()),
        s2(s),
        id(ui->txtPrep->text().remove(QRegExp("[\\(\\)]"))),
        ft(ui->txtAppend->toPlainText());

    if(s.isEmpty())
    {
        messages->MsgWarn(tr("no selected text!"));
        return;
    }

    int const cp=ui->txtFinal->textCursor().position();
    QRegExp r("(</czech>|</english>)");
    r.indexIn(ui->txtFinal->toPlainText(),cp);
    QString rblock(r.cap(0));

    if(rblock.isEmpty())
    {
        messages->MsgErr(tr("selected text is outside of language blocks!"));
        return;
    }

    s2.prepend("<a name=\""+s2+"*"+id+"\"></a>[");
    s2.append("] ");

    ft.replace(rblock,s2+"\n"+rblock);
    if(ft.indexOf(s2)==-1)
    {
        messages->MsgErr(tr("section 'append' contains invalid language blocks!"));
        return;
    }

    ui->txtAppend->setPlainText(ft);

    s.prepend("<sup><a href=\"#"+s+"*"+id+"\">");
    s.append("</a></sup>");

    ui->txtFinal->insertPlainText(s);

}

void CIntLinTr::on_btIdTag_clicked()
{
    QString s(ui->txtAppend->textCursor().selectedText());

    ui->txtAppend->insertPlainText("<id>"+s+"</id>");
}

void CIntLinTr::on_btGkTag_clicked()
{
    QString s(ui->txtAppend->textCursor().selectedText());

    ui->txtAppend->insertPlainText("<gk>"+s+"</gk>");
}

void CIntLinTr::on_btCopTag_clicked()
{
    QString s(ui->txtAppend->textCursor().selectedText());

    ui->txtAppend->insertPlainText("<cop>"+s+"</cop>");
}

void CIntLinTr::on_btP_clicked()
{
    if(ui->tblInter->currentRow()==0||ui->tblInter->currentRow()==3)
    {
        if(ui->tblInter->selectedItems().count()>0)
        {
            QTableWidgetItem * wi(ui->tblInter->selectedItems().at(0));
            if(wi)
            {
                QString t(wi->text());
                if(t.startsWith("-"))
                    t.remove(0,1);
                if(t.indexOf(QRegExp("[+=-]$"))!=-1)
                    t.chop(1);
                t.prepend("-");
                wi->setText(t);

                ui->tblInter->setCurrentCell(wi->row(),wi->column()+2);
                ui->tblInter->setCurrentCell(wi->row(),wi->column()+1);
            }
        }
    }
}

void CIntLinTr::on_btA1_clicked()
{
    if(ui->tblInter->currentRow()==0||ui->tblInter->currentRow()==3)
    {
        if(ui->tblInter->selectedItems().count()>0)
        {
            QTableWidgetItem * wi(ui->tblInter->selectedItems().at(0));
            if(wi)
            {
                QString t(wi->text());
                if(t.startsWith("-"))
                    t.remove(0,1);
                if(t.indexOf(QRegExp("[+=-]$"))!=-1)
                    t.chop(1);
                t.append("-");
                wi->setText(t);

                ui->tblInter->setCurrentCell(wi->row(),wi->column()+2);
                ui->tblInter->setCurrentCell(wi->row(),wi->column()+1);
            }
        }
    }
}

void CIntLinTr::on_btA2_clicked()
{
    if(ui->tblInter->currentRow()==0||ui->tblInter->currentRow()==3)
    {
        if(ui->tblInter->selectedItems().count()>0)
        {
            QTableWidgetItem * wi(ui->tblInter->selectedItems().at(0));
            if(wi)
            {
                QString t(wi->text());
                if(t.startsWith("-"))
                    t.remove(0,1);
                if(t.indexOf(QRegExp("[+=-]$"))!=-1)
                    t.chop(1);
                t.append("=");
                wi->setText(t);

                ui->tblInter->setCurrentCell(wi->row(),wi->column()+2);
                ui->tblInter->setCurrentCell(wi->row(),wi->column()+1);
            }
        }
    }
}

void CIntLinTr::on_btA3_clicked()
{
    if(ui->tblInter->currentRow()==0||ui->tblInter->currentRow()==3)
    {
        if(ui->tblInter->selectedItems().count()>0)
        {
            QTableWidgetItem * wi(ui->tblInter->selectedItems().at(0));
            if(wi)
            {
                QString t(wi->text());
                if(t.startsWith("-"))
                    t.remove(0,1);
                if(t.indexOf(QRegExp("[+=-]$"))!=-1)
                    t.chop(1);
                t.append("+");
                wi->setText(t);

                ui->tblInter->setCurrentCell(wi->row(),wi->column()+2);
                ui->tblInter->setCurrentCell(wi->row(),wi->column()+1);
            }
        }
    }
}

void CIntLinTr::on_btNAP_clicked()
{
    int r(ui->tblInter->currentRow());
    if(r==0||r==3)
    {
        if(ui->tblInter->selectedItems().count()>0)
        {
            QTableWidgetItem * wi(ui->tblInter->selectedItems().at(0));
            if(wi)
            {
                QString t(wi->text());
                if(t.startsWith("-"))
                    t.remove(0,1);
                if(t.indexOf(QRegExp("[+=-]$"))!=-1)
                    t.chop(1);

                wi->setText(t);

                ui->tblInter->setCurrentCell(wi->row(),wi->column()+2);
                ui->tblInter->setCurrentCell(wi->row(),wi->column()+1);
            }
        }
    }
}

void CIntLinTr::on_txtPrep_textChanged(QString )
{
    emit changed();
}

void CIntLinTr::on_txtRaw_textChanged()
{
    emit changed();
}

void CIntLinTr::on_txtFinal_textChanged()
{
    emit changed();
}

void CIntLinTr::on_txtAppend_textChanged()
{
    emit changed();
}

void CIntLinTr::on_tblInter_itemChanged(QTableWidgetItem* )
{
    emit changed();
}

void CIntLinTr::on_btAction_clicked(bool checked)
{
    if(checked)
    {
        popup.setButton(ui->btAction);
        on_tblInter_customContextMenuRequested(QPoint());
    }
}

QString CIntLinTr::cleanId(QString const & id) const
{
    QString b(id.left(2)),i(id.mid(2));
    return b+i.trimmed();
}
