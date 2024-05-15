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

#include "mfontchooser.h"
#include "ui_mfontchooser.h"

MFontChooser::MFontChooser(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MFontChooser)
{
    ui->setupUi(this);
}

MFontChooser::~MFontChooser()
{
    delete ui;
}

//

void MFontChooser::setCurrentFont(QFont const & font)
{
    ui->fcmbFont->setCurrentFont(font);
    ui->spnFontSize->setValue(font.pointSize());
}

void MFontChooser::on_spnFontSize_valueChanged(int value)
{
    QFont f(ui->fcmbFont->currentFont());
    f.setPointSize(value);
    emit fontUpdated(f);
}

void MFontChooser::on_fcmbFont_currentFontChanged(const QFont & font)
{
    QFont f(font);
    f.setPointSize(ui->spnFontSize->value());
    emit fontUpdated(f);
}
