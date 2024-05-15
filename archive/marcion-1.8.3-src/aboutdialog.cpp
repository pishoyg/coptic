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

#include "aboutdialog.h"
#include "ui_aboutdialog.h"

CAboutDialog::CAboutDialog(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::CAboutDialog)
{
    ui->setupUi(this);

    ui->lblM->setText(QString(ui->lblM->text()).replace("(*version*)",QString(tr("version ")+QCoreApplication::applicationVersion())));
    adjustSize();
    setMaximumSize(size());
    setMinimumSize(size());
}

CAboutDialog::~CAboutDialog()
{
    delete ui;
}

void CAboutDialog::changeEvent(QEvent *e)
{
    QDialog::changeEvent(e);
    switch (e->type()) {
    case QEvent::LanguageChange:
        ui->retranslateUi(this);
        break;
    default:
        break;
    }
}

void CAboutDialog::on_btClose_clicked()
{
    close();
}

void CAboutDialog::on_btLicense_clicked()
{
    showLicense(this);
}

void CAboutDialog::showLicense(QWidget * parent)
{
    CLicenseDialog ld(parent);
    ld.exec();
}
