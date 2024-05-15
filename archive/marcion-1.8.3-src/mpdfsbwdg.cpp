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

#include "mpdfsbwdg.h"
#include "ui_mpdfsbwdg.h"

MPdfSBWdg::MPdfSBWdg(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MPdfSBWdg)
{
    ui->setupUi(this);
}

MPdfSBWdg::~MPdfSBWdg()
{
    delete ui;
}

//

void MPdfSBWdg::setPercentValue(unsigned short dpi)
{
    ui->lblZoom->setText(QString::number(dpi)+"%");
}

void MPdfSBWdg::setRotValue(QString const & rot)
{
    ui->lblRot->setText(rot);
}

void  MPdfSBWdg::setPgNumValue(int value)
{
    ui->lblPgNum->setText(QString::number(value));
}

void  MPdfSBWdg::setPgMaxValue(int value)
{
    ui->lblPgMax->setText(QString::number(value));
}
