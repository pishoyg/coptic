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

#include "mdocheader.h"
#include "ui_mdocheader.h"

MDocHeader::MDocHeader(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MDocHeader),
    _bgr(),
    _stw(0),
    _mode(Text),
    gk_index(0),cop_index(0),cop_g_index(0),numcnv_index(0),heb_index(0)
{
    ui->setupUi(this);

    _bgr.setExclusive(true);
    _bgr.addButton(ui->tbText,1);
    _bgr.addButton(ui->tbGkDict,2);
    _bgr.addButton(ui->tbCoptDict,3);
    _bgr.addButton(ui->tbHebDict,4);
    _bgr.addButton(ui->tbCoptGram,5);
    _bgr.addButton(ui->tbNumConv,6);
    ui->tbText->setChecked(true);

    ui->tbGkDict->hide();
    ui->tbCoptDict->hide();
    ui->tbHebDict->hide();
    ui->tbCoptGram->hide();
    ui->tbNumConv->hide();

    hide();
}

MDocHeader::~MDocHeader()
{
    delete ui;
}

//

void MDocHeader::initFirstButton(QIcon const & icon, QString const & text)
{
    ui->tbText->setIcon(icon);
    ui->tbText->setText(text);
}

void MDocHeader::slot_bgr_clicked(int index)
{
    if(_stw)
        switch(index)
        {
        case 1 :
            ui->btDeleteCurrent->setEnabled(false);
            _mode=Text;
            _stw->setCurrentIndex(0);
            break;
        case 2 :
            ui->btDeleteCurrent->setEnabled(true);
            _mode=GkDict;
            _stw->setCurrentIndex(gk_index);
            break;
        case 3 :
            ui->btDeleteCurrent->setEnabled(true);
            _mode=CopDict;
            _stw->setCurrentIndex(cop_index);
            break;
        case 4 :
            ui->btDeleteCurrent->setEnabled(true);
            _mode=HebDict;
            _stw->setCurrentIndex(heb_index);
            break;
        case 5 :
            ui->btDeleteCurrent->setEnabled(true);
            _mode=CopGram;
            _stw->setCurrentIndex(cop_g_index);
            break;
        case 6 :
            ui->btDeleteCurrent->setEnabled(true);
            _mode=NumConv;
            _stw->setCurrentIndex(numcnv_index);
            break;
        }
}

void MDocHeader::setStWdg(QStackedWidget * widget)
{
    _stw=widget;
    slot_bgr_clicked(1);
    connect(&_bgr,SIGNAL(buttonClicked(int)),this,SLOT(slot_bgr_clicked(int)));
}

QStackedWidget * MDocHeader::stWdg()
{
    return _stw;
}

void MDocHeader::setDocMode(DocMode mode)
{
    _mode=mode;
    if(_stw)
        switch(_mode)
        {
        case Text :
            ui->btDeleteCurrent->setEnabled(false);
            ui->tbText->setChecked(true);
            _stw->setCurrentIndex(0);
            break;
        case GkDict :
            ui->btDeleteCurrent->setEnabled(true);
            ui->tbGkDict->show();
            ui->tbGkDict->setChecked(true);
            _stw->setCurrentIndex(gk_index);
            checkToolsCount();
            break;
        case CopDict :
            ui->btDeleteCurrent->setEnabled(true);
            ui->tbCoptDict->show();
            ui->tbCoptDict->setChecked(true);
            _stw->setCurrentIndex(cop_index);
            checkToolsCount();
            break;
        case HebDict :
            ui->btDeleteCurrent->setEnabled(true);
            ui->tbHebDict->show();
            ui->tbHebDict->setChecked(true);
            _stw->setCurrentIndex(heb_index);
            checkToolsCount();
            break;
        case CopGram :
            ui->btDeleteCurrent->setEnabled(true);
            ui->tbCoptGram->show();
            ui->tbCoptGram->setChecked(true);
            _stw->setCurrentIndex(cop_g_index);
            checkToolsCount();
            break;
        case NumConv :
            ui->btDeleteCurrent->setEnabled(true);
            ui->tbNumConv->show();
            ui->tbNumConv->setChecked(true);
            _stw->setCurrentIndex(numcnv_index);
            checkToolsCount();
            break;
        }
}

void MDocHeader::initPage(DocMode mode,int index)
{
    show();
    switch(mode)
    {
    case Text :
        ui->tbText->show();
        break;
    case GkDict :
        gk_index=index;
        ui->tbGkDict->show();
        break;
    case CopDict :
        cop_index=index;
        ui->tbCoptDict->show();
        break;
    case HebDict :
        heb_index=index;
        ui->tbHebDict->show();
        break;
    case CopGram :
        cop_g_index=index;
        ui->tbCoptGram->show();
        break;
    case NumConv :
        numcnv_index=index;
        ui->tbNumConv->show();
        break;
    }

    checkToolsCount();
}

void MDocHeader::on_btDeleteCurrent_clicked()
{
    if(_mode!=Text)
    {
        switch(_mode)
        {
        case Text :
            break;
        case GkDict :
            ui->tbGkDict->hide();
            break;
        case CopDict :
            ui->tbCoptDict->hide();
            break;
        case HebDict :
            ui->tbHebDict->hide();
            break;
        case CopGram :
            ui->tbCoptGram->hide();
            break;
        case NumConv :
            ui->tbNumConv->hide();
            break;
        }

        checkToolsCount();
        setDocMode();
    }
}

void MDocHeader::checkToolsCount()
{
    int c=-1;
    for(int x=0;x<_bgr.buttons().count();x++)
    {
        if(_bgr.buttons().at(x)->isVisible())
            c++;
    }
    if(c<0)
        c=0;
    ui->lblCount->setText(QString::number(c));
}
