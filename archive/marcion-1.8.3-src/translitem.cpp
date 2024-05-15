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

#include "translitem.h"
#include "ui_translitem.h"

CTranslItem::CTranslItem(Lang lang,QFont const & f,int column,bool extra,int extend,QWidget *parent) :
    QWidget(parent),
    ui(new Ui::CTranslItem),
    lang(lang),
    _column(column),_extend(extend),
    extra(extra)
{
    ui->setupUi(this);
    ui->cmbWords->setFont(f);
}

CTranslItem::~CTranslItem()
{
    delete ui;
}

void CTranslItem::changeEvent(QEvent *e)
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

void CTranslItem::on_btRefresh_clicked()
{
    emit refreshRequested(lang,_column,extra);
}

QString CTranslItem::selectedWord() const
{
    /*int ci(ui->cmbWords->currentIndex());
    if(ci!=-1)
        return ui->cmbWords->currentText();
    else
        return QString();*/

    return ui->cmbWords->currentText();
}

QString CTranslItem::coptDictId() const
{
    int ci(ui->cmbWords->currentIndex());
    if(ci!=-1)
    {
        QString id(ui->cmbWords->itemData(ci).toString());
        /*QString id(ui->cmbWords->itemData(ci).toString()),
            wrd(ui->cmbWords->currentText());
        if(wrd.startsWith("(gk) "))
            return QString("4-"+wrd.remove(QRegExp("^\\(gk\\)\\ ")));
        else
        {*/
            if(id!=QString("0-0"))
                return id;
            else
                return QString();
        //}
    }
    else
        return QString();
}

void CTranslItem::addItem(QString const & text)
{
    QStringList l(text.split("#",QString::KeepEmptyParts));

    switch(l.count())
    {
    case 2 :
        ui->cmbWords->appendSingle(l[0],-1,l[1]);
        break;
    case 3 :
        ui->cmbWords->appendSingle(l[0],l[2].toInt(),l[1]);
        break;
    }

}

void CTranslItem::addItem2(QString const & word,int uniq,QString const & crumid,bool newbranch)
{
    if(newbranch)
        ui->cmbWords->appendBranch(crumid);
    ui->cmbWords->appendItemToLastBranch(word,uniq,crumid);
}

void CTranslItem::clear()
{
    ui->cmbWords->clear();
}

void CTranslItem::on_cmbWords_currentIndexChanged(int index)
{
    if(index!=-1)
    {
        QString d(ui->cmbWords->itemData(index).toString());
        //d.remove(QRegExp("\\/.*$"));
        ui->lblGroup->setText(d);
    }
    emit wordChanged(lang,_column,index,extra);
}

void CTranslItem::selectItem(int index)
{
    ui->cmbWords->setCurrentIndex(index);
}

void CTranslItem::setFont(const QFont & f)
{
    QWidget::setFont(f);
    ui->cmbWords->setFont(f);
}

/*void CTranslItem::findOrigId(QString const & id)
{
    int i(ui->cmbWords->findData(id,Qt::UserRole,Qt::MatchFixedString|Qt::MatchCaseSensitive));
    if(i!=-1)
        ui->cmbWords->setCurrentIndex(i);
}*/

int CTranslItem::currentOrigId() const
{
    return ui->cmbWords->currentOrigId();
}

void CTranslItem::setOrigId(int uniq)
{
    ui->cmbWords->setOrigId(uniq);
}

bool CTranslItem::isSelGroupGreek() const
{
    return ui->lblGroup->text().contains("(gk)");
}
