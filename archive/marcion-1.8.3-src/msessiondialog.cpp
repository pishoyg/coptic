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

#include "msessiondialog.h"
#include "ui_msessiondialog.h"

MSessionDialog::MSessionDialog(QString const & filenames,QWidget *parent) :
    QDialog(parent),
    ui(new Ui::MSessionDialog)
{
    ui->setupUi(this);
    ui->lblFiles->setText(tr("Files to open:\n\n")+filenames);

    adjustSize();
    setMaximumSize(size());
    setMinimumSize(size());
}

MSessionDialog::~MSessionDialog()
{
    delete ui;
}

MSessionDialog::Action MSessionDialog::action() const
{
    if(ui->rbDefault->isChecked())
        return MSessionDialog::DefautSession;
    if(ui->rbThis->isChecked())
        return MSessionDialog::NewSession;
    if(ui->rbQuit->isChecked())
        return MSessionDialog::Quit;
    return MSessionDialog::Quit;
}
