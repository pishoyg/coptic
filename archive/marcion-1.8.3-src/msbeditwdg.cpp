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

#include "msbeditwdg.h"
#include "ui_msbeditwdg.h"

MSbEditWdg::MSbEditWdg(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MSbEditWdg)
{
    ui->setupUi(this);
}

MSbEditWdg::~MSbEditWdg()
{
    delete ui;
}

//

void MSbEditWdg::setLinesCount(int count)
{
    ui->lblLines->setText(QString::number(count));
}

void MSbEditWdg::setCharsCount(int count)
{
    ui->lblChars->setText(QString::number(count));
}

void MSbEditWdg::setCursorPos(int chars)
{
    ui->lblCursorPos->setText(QString::number(chars));
}
