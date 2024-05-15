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

#include "tbldesigner.h"
#include "ui_tbldesigner.h"

QString const CTblDesigner::_bt("<table style=\"p_text-align: v_text-align; width: 100%; p_border-color: v_border-color;\" p_border=\"v_border\" p_cellpadding=\"v_cellpadding\" p_cellspacing=\"v_cellspacing\">");
QString const CTblDesigner::_br("<tr><td style=\"p_text-align: v_text-align; p_background-color: v_background-color; p_vertical-align: v_vertical-align;\"><b><small><a href=\"(*verse-ref*)\" style=\"p3_color: v3_color; p4_background-color: v4_background-color; p_text-decoration: v_text-decoration;\">(*verse*)</a></small></b></td><td style=\"p2_background-color: v2_background-color; p2_text-align: v2_text-align;\">(*text*)</td></tr>");
QString const CTblDesigner::_lsr("<table style=\"p_text-align: v_text-align; width: 100%; p_border-color: v_border-color;\" p_border=\"v_border\" p_cellpadding=\"v_cellpadding\" p_cellspacing=\"v_cellspacing\"><tbody><tr><td style=\"p_vertical-align: v_vertical-align; p_background-color: v_background-color\">**num**</td><td style=\"p2_vertical-align: v2_vertical-align; p2_background-color: v2_background-color\"><a href=\"book(*)(*name*)(*)(*id*)(*)(*sc*)(*)(*chapter*)(*)(*verse*)(*)(*fmt*)\">**loc**</td><td style=\"p3_vertical-align: v3_vertical-align; p3_background-color: v3_background-color\">**col**</td></tr><tr><td p_colspan=\"v_colspan\" p_rowspan=\"v_rowspan\" style=\"p4_vertical-align: v4_vertical-align;\">**txt**</td></tr></tbody></table>");

CTblDesigner::CTblDesigner(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::CTblDesigner),
    _prop(),
    _type(BookT),
    _html()
{
    ui->setupUi(this);

    //adjustSize();
}

CTblDesigner::~CTblDesigner()
{
    delete ui;
}

void CTblDesigner::changeEvent(QEvent *e)
{
    QDialog::changeEvent(e);
    switch (e->type()) {
    case QEvent::LanguageChange:
        ui->retranslateUi(this);
        break;
    default:
        break;
    }
}

bool CTblDesigner::init(Type type,QString const & values)
{
    QStringList l(values.split(";"));

    _type=type;
    _prop.clear();
    switch(_type)
    {
    case BookT :
        {
            if(l.count()!=5)
                return false;

            _prop << CTblPropItem("p_text-align","text-align","text-align","v_text-align",l[0],CTblPropItem::Text)
                  << CTblPropItem("p_border-color","border-color","border-color","v_border-color",l[1],CTblPropItem::Color)
                  << CTblPropItem("p_border","border","border","v_border",l[2],CTblPropItem::Number)
                  << CTblPropItem("p_cellpadding","cellpadding","cellpadding","v_cellpadding",l[3],CTblPropItem::Number)
                  << CTblPropItem("p_cellspacing","cellspacing","cellspacing","v_cellspacing",l[4],CTblPropItem::Number);
            break;
        }
    case BookR :
        {
            if(l.count()!=8)
                return false;

            _prop << CTblPropItem("p_text-align","text-align","verse number text-align","v_text-align",l[0],CTblPropItem::Text)
                  << CTblPropItem("p_background-color","background-color","verse number background-color","v_background-color",l[1],CTblPropItem::Color)
                  << CTblPropItem("p_vertical-align","vertical-align","verse number vertical-align","v_vertical-align",l[2],CTblPropItem::Text)
                  << CTblPropItem("p2_background-color","background-color","verse text background-color","v2_background-color",l[3],CTblPropItem::Color)
                  << CTblPropItem("p2_text-align","text-align","verse text text-align","v2_text-align",l[4],CTblPropItem::Text)
            << CTblPropItem("p3_color","color","verse number color","v3_color",l[5],CTblPropItem::Color)
                    << CTblPropItem("p4_background-color","background-color","verse number background-color","v4_background-color",l[6],CTblPropItem::Color)
                    << CTblPropItem("p_text-decoration","text-decoration","verse number text-decoration","v_text-decoration",l[7],CTblPropItem::Text);
            break;
        }
    case LibSearch :
        {
            if(l.count()!=14)
                return false;
            _prop << CTblPropItem("p_text-align","text-align","number text-align","v_text-align",l[0],CTblPropItem::Text)
                  << CTblPropItem("p_border-color","border-color","border-color","v_border-color",l[1],CTblPropItem::Color)
                  << CTblPropItem("p_border","border","border","v_border",l[2],CTblPropItem::Number)
                  << CTblPropItem("p_cellpadding","cellpadding","cellpadding","v_cellpadding",l[3],CTblPropItem::Number)
                  << CTblPropItem("p_cellspacing","cellspacing","cellspacing","v_cellspacing",l[4],CTblPropItem::Number)
                  << CTblPropItem("p_vertical-align","vertical-align","pos vertical-align","v_vertical-align",l[5],CTblPropItem::Text)
                  << CTblPropItem("p_background-color","background-color","pos background-color","v_background-color",l[6],CTblPropItem::Color)
                  << CTblPropItem("p2_vertical-align","vertical-align","book vertical-align","v2_vertical-align",l[7],CTblPropItem::Text)
                  << CTblPropItem("p2_background-color","background-color","book background-color","v2_background-color",l[8],CTblPropItem::Color)
                  << CTblPropItem("p3_vertical-align","vertical-align","collection vertical-align","v3_vertical-align",l[9],CTblPropItem::Text)
                  << CTblPropItem("p3_background-color","background-color","collection background-color","v3_background-color",l[10],CTblPropItem::Color)
                  << CTblPropItem("p_colspan","colspan","text colspan","v_colspan",l[11],CTblPropItem::Number)
                  << CTblPropItem("p_rowspan","rowspan","text rowspan","v_rowspan",l[12],CTblPropItem::Number)
                  << CTblPropItem("p4_vertical-align","vertical-align","text vertical-align","v4_vertical-align",l[13],CTblPropItem::Text);


            break;
        }
    }

    ui->trwProp->clear();
    for(int x=0;x<_prop.count();x++)
    {
        QTreeWidgetItem * i=new QTreeWidgetItem(0);

        i->setText(0,_prop[x]._dn);
        i->setText(1,_prop[x]._v);
        ui->trwProp->addTopLevelItem(i);
        if(_prop[x]._type==CTblPropItem::Number||_prop[x]._type==CTblPropItem::Text)
            ui->trwProp->openPersistentEditor(i,1);
    }
    ui->trwProp->resizeColumnToContents(0);
    ui->trwProp->resizeColumnToContents(1);
    adjustSize();
    return true;
}

void CTblDesigner::on_buttonBox_clicked(QAbstractButton* button)
{
    if((void*)button==(void*)ui->buttonBox->button(QDialogButtonBox::Close))
        reject();
    else if((void*)button==(void*)ui->buttonBox->button(QDialogButtonBox::Apply))
    {
        createHtml();
        accept();
    }
    else if((void*)button==(void*)ui->buttonBox->button(QDialogButtonBox::RestoreDefaults))
    {
        for(int x=0;x<_prop.count();x++)
        {
            ui->trwProp->topLevelItem(x)->setText(1,_prop[x]._v);
        }
    }
}

QString CTblDesigner::values() const
{
    QString r;
    for(int x=0;x<ui->trwProp->topLevelItemCount();x++)
    {
        r.append(ui->trwProp->topLevelItem(x)->text(1)+";");
    }
    r.chop(1);
    return r;
}

void CTblDesigner::on_trwProp_itemDoubleClicked(QTreeWidgetItem* item, int )
{
    //ui->trwProp->editItem(item,1);
    for(int x=0;x<ui->trwProp->topLevelItemCount();x++)
    {
        if(ui->trwProp->topLevelItem(x)==item)
        {
            CTblPropItem * tpi=&_prop[x];
            switch(tpi->_type)
            {
            case CTblPropItem::Color :
                {
                    QColorDialog cd(item->text(1),this);
                    if(cd.exec()==QDialog::Accepted)
                        item->setText(1,cd.currentColor().name());
                    break;
                }
            case CTblPropItem::Number :
            case CTblPropItem::Text :
                {
                    break;
                }
            }
        }
    }
}

void CTblDesigner::createHtml()
{
    switch(_type)
    {
    case BookT :
        _html=_bt;
        break;
    case BookR :
        _html=_br;
        break;
    case LibSearch :
        _html=_lsr;
        break;
    }

    for(int x=0;x<_prop.count();x++)
    {
        _html.replace(_prop[x]._t,_prop[x]._p);
        _html.replace(_prop[x]._tv,ui->trwProp->topLevelItem(x)->text(1));
    }
}

//

CTblPropItem::CTblPropItem()
    :_t(QString()),
    _p(QString()),
    _dn(QString()),
    _tv(QString()),
    _v(QString()),
    _type(Number)
{

}

CTblPropItem::CTblPropItem(QString const & templat,QString const & prop,QString const & disptxt,QString const & tval,QString const & val,Type type)
    :_t(templat),
    _p(prop),
    _dn(disptxt),
    _tv(tval),
    _v(val),
    _type(type)
{

}

CTblPropItem::~CTblPropItem()
{

}
