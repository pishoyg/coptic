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

#include "licensedialog.h"
#include "ui_licensedialog.h"

CLicenseDialog::CLicenseDialog(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::CLicenseDialog)
{
    ui->setupUi(this);

    QString s;
    QString const fname(QDir::toNativeSeparators("data/GPLv2.txt"));
    QFile f(fname);
    if(f.open(QIODevice::ReadOnly))
    {
        s=QString(f.readAll());
        f.close();
    }
    else
        s=QString(tr("file '")+fname+tr("' not found!"));

    ui->txtText->setPlainText(s);

    showMaximized();
}

CLicenseDialog::~CLicenseDialog()
{
    delete ui;
}

void CLicenseDialog::on_btClose_clicked()
{
    close();
}
