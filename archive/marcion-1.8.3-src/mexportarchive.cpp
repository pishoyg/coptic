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

#include "mexportarchive.h"
#include "ui_mexportarchive.h"

MExportArchive::MExportArchive(bool export_mode,QWidget *parent) :
    QDialog(parent),
    ui(new Ui::MExportArchive),
    _default_dir(m_sett()->marcDir+QDir::toNativeSeparators("/data/backup")),
    _default_filename(_default_dir+QDir::separator()+"archive-backup.msql"),
    _export_mode(export_mode)
{
    ui->setupUi(this);

    if(_export_mode)
        ui->txtFile->setText(_default_filename);
    else
    {
        ui->txtFile->clear();
        ui->buttonBox->button(QDialogButtonBox::Ok)->setEnabled(false);
        ui->cbCompress->hide();
        setWindowTitle(tr("import archive"));
        ui->lblText->setText(tr("Choose an input file containing an exported archive.\nEntire current archive will be DELETED."));
    }

    adjustSize();
    setMinimumHeight(height());
    setMaximumHeight(height());
}

MExportArchive::~MExportArchive()
{
    delete ui;
}

void MExportArchive::on_btFile_clicked()
{
    QFileDialog fd(this,tr("export archive into file"),QString(),"msql files (*.msql);;compressed msql files (*.msql.bz2);;all files (*)");
    if(_export_mode)
    {
        fd.setFileMode(QFileDialog::AnyFile);
        fd.setAcceptMode(QFileDialog::AcceptSave);
    }
    else
    {
        fd.setWindowTitle(tr("import archive from file"));
        fd.setFileMode(QFileDialog::ExistingFile);
        fd.setAcceptMode(QFileDialog::AcceptOpen);
    }

    fd.setDefaultSuffix("msql");
    fd.setDirectory(_default_dir);
    if(fd.exec()==QDialog::Accepted)
        if(fd.selectedFiles().count()>0)
            ui->txtFile->setText(fd.selectedFiles().first());
}

bool MExportArchive::exportData() const
{
    return ui->cbData->isChecked();
}

bool MExportArchive::exportIndex() const
{
    return ui->cbIndex->isChecked();
}

bool MExportArchive::exportAuthors() const
{
    return ui->cbAuth->isChecked();
}

bool MExportArchive::exportCategories() const
{
    return ui->cbCat->isChecked();
}

QString MExportArchive::exportFilename() const
{
    return ui->txtFile->text();
}

void MExportArchive::on_txtFile_textChanged(const QString &arg1)
{
    if(!_export_mode)
        ui->buttonBox->button(QDialogButtonBox::Ok)->setEnabled(!arg1.isEmpty());
}

bool MExportArchive::compress() const
{
    return ui->cbCompress->isChecked();
}
