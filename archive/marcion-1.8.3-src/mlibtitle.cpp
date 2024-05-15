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

#include "mlibtitle.h"
#include "ui_mlibtitle.h"

MLibTitle::MLibTitle(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MLibTitle)
{
    ui->setupUi(this);

    ui->label->setText(tr("library"));

    IC_SIZES
}

MLibTitle::~MLibTitle()
{
    delete ui;
}

void MLibTitle::on_btAction_clicked(bool checked)
{
    if(checked)
        emit menuRequested();
}

/*void MLibTitle::on_btDetach_clicked(bool checked)
{
    emit detachClicked(checked);
}*/

void MLibTitle::on_btHide_clicked()
{
    emit hideClicked(false);
}

QAbstractButton * MLibTitle::actionButtonPtr() const
{
    return ui->btAction;
}
