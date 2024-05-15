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

#include "msimulitem.h"
#include "ui_msimulitem.h"

MSimulItem::MSimulItem(QString const & label,int id,int text_format,int script,QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MSimulItem),
    _label(label),
    _id(id),
    _text_format(text_format),
    _script(script)
{
    ui->setupUi(this);

    //setAutoFillBackground(true);

    ui->label->setText(_label);
    setToolTip(_label);

    IC_SIZES

    setMinimumHeight(height());
    setMaximumHeight(height());
}

MSimulItem::~MSimulItem()
{
    delete ui;
}

void MSimulItem::on_tbRemove_clicked()
{
    emit action(Close);
}

void MSimulItem::on_spnChOffset_valueChanged(int )
{
    emit action(Change);
}

void MSimulItem::on_spnVOffset_valueChanged(int )
{
    emit action(Change);
}

int MSimulItem::chapterOffset() const
{
    return ui->spnChOffset->value();
}

int MSimulItem::verseOffset() const
{
    return ui->spnVOffset->value();
}
