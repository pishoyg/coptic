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

#include "searchcriteria2.h"
#include "ui_searchcriteria2.h"

CSearchCriteria2::CSearchCriteria2(QWidget *parent)
        :QDialog(parent),
          ui(new Ui::CSearchCriteria2)
{
    ui->setupUi(this);
    ui->txtInput->setSwitchState(true);
    ui->txtInput->setVAsPreferred();
}

CSearchCriteria2::~CSearchCriteria2()
{
    delete ui;
}

//

CLatCopt * CSearchCriteria2::input(){return ui->txtInput;}

void CSearchCriteria2::on_btAdd_clicked()
{
    ui->txtInput->updateL(false,CTranslit::RemoveNone);
    if(ui->btOr->isChecked())
    {
        ui->lstWords->addItem("OR");
        ui->txtInput->setText(QString());
        ui->btOr->setChecked(false);
    }
    else
    {
        ui->lstWords->addItem(ui->txtInput->text());
        ui->txtInput->setText(QString());
    }
}

void CSearchCriteria2::on_btDel_clicked()
{
    int r(ui->lstWords->currentRow());
    if(r!=-1)
        ui->lstWords->takeItem(r);
}

void CSearchCriteria2::on_buttonBox_rejected()
{
    reject();
}

void CSearchCriteria2::on_buttonBox_accepted()
{
    accept();
}
QList<QStringList> & CSearchCriteria2::makeList()
{
    criteria.clear();

    int ii=0;
    criteria.append(QStringList());
    for(int x=0;x<ui->lstWords->count();x++)
    {
        QString i(ui->lstWords->item(x)->text());
        if(i=="OR")
        {
            ++ii;
            criteria.append(QStringList());
        }
        else
            criteria[ii].append(i);
    }
    if(criteria[ii].size()==0)
        criteria.removeLast();

    return criteria;
}

void CSearchCriteria2::on_btIns_clicked()
{
    ui->txtInput->updateL(false,CTranslit::RemoveNone);
    int r(ui->lstWords->currentRow());
    if(r!=-1)
    {
        if(ui->btOr->isChecked())
        {
            ui->lstWords->insertItem(r,"OR");
            ui->txtInput->setText(QString());
            ui->btOr->setChecked(false);
        }
        else
        {
            ui->lstWords->insertItem(r,ui->txtInput->text());
            ui->txtInput->setText(QString());
        }
    }
}

void CSearchCriteria2::on_lstWords_itemActivated(QListWidgetItem* item)
{
    ui->txtInput->setText(item->text());
}

void CSearchCriteria2::on_btUpd_clicked()
{
    ui->txtInput->updateL(false,CTranslit::RemoveNone);
    int r(ui->lstWords->currentRow());

    if(r!=-1)
    {
        ui->lstWords->item(r)->setText(ui->txtInput->text());
        ui->txtInput->setText(QString());
    }
}

/*void CSearchCriteria2::init_list(QString const & inp)
{
    QString s(inp.trimmed());

    if(s.isEmpty())
        return;

    s.remove(QRegExp("^ *\\(")).remove(QRegExp("\\) *$"));
    QStringList ls(s.split(QRegExp("\\) *or *\\(")));

    foreach(QString i,ls)
    {
        QStringList ls2(i.trimmed().split("and"));
        foreach(QString i2,ls2)
            lstWords->addItem(i2.trimmed().remove(QRegExp("^.*` +")));
        lstWords->addItem("OR");
    }
    if(lstWords->count()>0)
        lstWords->takeItem(lstWords->count()-1);
}*/

QString CSearchCriteria2::makeWhere(Match match)
{
    CSearchCriteria2::match=match;
    return makeWhere();
}

QString CSearchCriteria2::makeWhere() const
{
    QString r;
    for(int x=0;x<criteria.size();x++)
    {
        QString w,l("( ");
        foreach(w,criteria[x])
        {
            QString notf;
            if(w.indexOf(QRegExp("^not "))!=-1)
            {
                w.remove(QRegExp("^not "));
                notf="not ";
            }

            if(match==Word)
                l.append(notf+"match_word('"+w+"',`i_key`) and ");
            else
                l.append(notf+"match_phrase('"+w+"',`part1`,`part2`,`specindex`=2) and ");
        }
        l.remove(QRegExp(" and $")).append(" )");
        r.append(l+" or ");
    }
    return r.remove(QRegExp(" or $"));
}

void CSearchCriteria2::init(CTranslit::Script script,Match match)
{
    ui->txtInput->setScript(script);
    CSearchCriteria2::match=match;
}

void CSearchCriteria2::on_btClear_clicked()
{
    ui->lstWords->clear();
}

void CSearchCriteria2::on_btNot_clicked()
{
    int r(ui->lstWords->currentRow());

    if(r!=-1)
    {
        QString i(ui->lstWords->item(r)->text());
        if(i.indexOf(QRegExp("^not "))==-1)
            ui->lstWords->item(r)->setText("not "+i);
        else
            ui->lstWords->item(r)->setText(i.remove(QRegExp("^not ")));
    }
}

QString CSearchCriteria2::makeRegExp() const
{
    QRegExp r("\\|not .*\\|"),r2("^not .*\\|");
    r.setMinimal(true);
    r2.setMinimal(true);
    QString re;
    for(int x=0;x<criteria.count();x++)
    {
        QStringList const l(criteria[x]);
        re.append(QString(l.join("|")+"|"));
    }
    re.remove(r2);
    re.replace(r,"|");
    re.chop(1);
    return QString("("+re+")");
}
