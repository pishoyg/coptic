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

#include "msetarchivedata.h"
#include "ui_msetarchivedata.h"

MSetArchiveData::MSetArchiveData(QString const & filepath,
                                 QWidget *parent) :
    QDialog(parent),
    ui(new Ui::MSetArchiveData),
    _filepath(filepath),
    _item_found(false)
{
    ui->setupUi(this);
    ui->lblFilePath->setText(_filepath);
    ui->lblFilePath->setToolTip(_filepath);

    adjustSize();
}

MSetArchiveData::~MSetArchiveData()
{
    delete ui;
}

void MSetArchiveData::on_rbOne_clicked(bool checked)
{
    if(checked)
        ui->buttonBox->button(QDialogButtonBox::Ok)->setEnabled(true);
    ui->wdgTgz->setEnabled(!checked);
    ui->lblTgzRes->setEnabled(!checked);
}

void MSetArchiveData::on_rbTgz_clicked(bool checked)
{
    ui->buttonBox->button(QDialogButtonBox::Ok)->setEnabled(checked&&_item_found);
    if(checked&&!ui->wdgTgz->isListPrep())
        ui->wdgTgz->init(0,true);
    ui->wdgTgz->setEnabled(checked);
    ui->lblTgzRes->setEnabled(checked);
}

bool MSetArchiveData::isOneFileMode() const
{
    return ui->rbOne->isChecked();
}

QString MSetArchiveData::selectedFile() const
{
    return ui->wdgTgz->selectedFile();
}

void MSetArchiveData::on_wdgTgz_tgzExamined()
{
    _item_found=ui->wdgTgz->checkFilePath(_filepath);
    ui->buttonBox->button(QDialogButtonBox::Ok)->setEnabled(_item_found);
    if(_item_found)
        ui->lblTgzRes->setText(tr("<span style=\"color: blue;\">Ok.</span> File is presented in the tarball."));
    else
        ui->lblTgzRes->setText(tr("<span style=\"color: red;\">Error:</span> File is not presented in the tarball!"));
}

void MSetArchiveData::on_wdgTgz_beforeQuery()
{
    _item_found=false;
    ui->buttonBox->button(QDialogButtonBox::Ok)->setEnabled(false);
    ui->lblTgzRes->clear();
}

unsigned int MSetArchiveData::tgzId() const
{
    return ui->wdgTgz->currentId();
}

unsigned int MSetArchiveData::tgzSize() const
{
    return ui->wdgTgz->sizeOfTgz();
}

QString MSetArchiveData::tgzName() const
{
    return ui->wdgTgz->nameOfTgz();
}
