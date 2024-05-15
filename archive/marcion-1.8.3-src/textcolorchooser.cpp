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

#include "textcolorchooser.h"
#include "ui_textcolorchooser.h"

CTextColorChooser::CTextColorChooser(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::CTextColorChooser)
{
    ui->setupUi(this);
}

CTextColorChooser::~CTextColorChooser()
{
    delete ui;
}

void CTextColorChooser::init(QString const & foreg, QString const & backg, QString const & text,CTextColorChooser::Buttons buttons)
{
    ui->btHTFg->setText(foreg);
    ui->btHTBg->setText(backg);
    CTextColorChooser::text=text;
    ui->lblTitle->setText(text);

    updateColors();

    switch(buttons)
    {
    case Both :
        break;
    case Foreground :
        ui->btHTBg->hide();
        break;
    case Background :
        ui->btHTFg->hide();
        break;
    }
}

void CTextColorChooser::on_btHTFg_clicked()
{
    QColorDialog cd(QColor(ui->btHTFg->text()));
    if(cd.exec())
    {
        ui->btHTFg->setText(cd.currentColor().name());
        updateColors();
    }
}

void CTextColorChooser::on_btHTBg_clicked()
{
    QColorDialog cd(QColor(ui->btHTBg->text()));
    if(cd.exec())
    {
        ui->btHTBg->setText(cd.currentColor().name());
        updateColors();
        emit bgColorSelected(cd.currentColor());
    }
}

void CTextColorChooser::updateColors()
{
    ui->lblHT->setText("<span style=\"color: "+ui->btHTFg->text()+"; background-color: "+ui->btHTBg->text()+"\"><big><b>"+text+"</b></big></span>");
    bgc=QColor(ui->btHTBg->text());
    fgc=QColor(ui->btHTFg->text());
}

QString CTextColorChooser::fgColor() const
{
    return ui->btHTFg->text();
}

QString CTextColorChooser::bgColor() const
{
    return ui->btHTBg->text();
}

QColor CTextColorChooser::fgC() const
{
    return fgc;
}

QColor CTextColorChooser::bgC() const
{
    return bgc;
}
