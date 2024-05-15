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

#include "mmsgtitle.h"
#include "ui_mmsgtitle.h"

MMsgTitle::MMsgTitle(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MMsgTitle)
{
    ui->setupUi(this);
    ui->label->setText(tr("messages"));

    IC_SIZES
}

MMsgTitle::~MMsgTitle()
{
    delete ui;
}

void MMsgTitle::on_btTop_clicked()
{
    emit request(MMsgTitle::Top);
}

void MMsgTitle::on_btBottom_clicked()
{
    emit request(MMsgTitle::Bottom);
}

void MMsgTitle::on_btHide_clicked()
{
    emit request(MMsgTitle::Hide);
}

void MMsgTitle::on_btClear_clicked()
{
    emit request(MMsgTitle::Clear);
}

void MMsgTitle::on_btHelp_clicked()
{
    emit request(MMsgTitle::Help);
}

void MMsgTitle::on_btVersion_clicked()
{
    emit request(MMsgTitle::Version);
}
