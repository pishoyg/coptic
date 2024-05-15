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

#include "exporttr.h"
#include "ui_exporttr.h"

CExportTr::CExportTr(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::CExportTr)
{
    ui->setupUi(this);

    ui->cchTbl->init("black","white","no text");
    ui->cchHead->init("black","white","(10/4b)-(10/7)");
    ui->cchText->init("black","white","It looks good.");
    ui->cchCell->init("black","white","word");

    adjustSize();
    setFixedHeight(height());
}

CExportTr::~CExportTr()
{
    delete ui;
}

void CExportTr::changeEvent(QEvent *e)
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

void CExportTr::on_btChooseFile_clicked()
{
    QFileInfo fi(ui->txtFile->text());

    QFileDialog fd(this,tr("export to html"),fi.absolutePath(),"ilt.html files (*.ilt.html);;html files (*.html);;all files (*)");
    fd.setAcceptMode(QFileDialog::AcceptSave);
    fd.setFileMode(QFileDialog::AnyFile);
    fd.setDefaultSuffix("ilt.html");
    fd.selectFile(fi.fileName());

    if(fd.exec()==QDialog::Accepted)
    {
        if(fd.selectedFiles().count()>0)
        {
            ui->txtFile->setText(fd.selectedFiles().first());
        }
    }
}

bool CExportTr::langEn() const
{
    return ui->rbEn->isChecked();
}

bool CExportTr::langCz() const
{
    return ui->rbCz->isChecked();
}

bool CExportTr::longTr() const
{
    return ui->rbFull->isChecked();
}

QString CExportTr::filename() const
{
    return ui->txtFile->text();
}

QString CExportTr::robots() const
{
    return ui->cmbRobots->currentText();
}

void CExportTr::setEn(bool en)
{
    ui->rbEn->setChecked(en);
    ui->rbCz->setChecked(!en);
}

void CExportTr::setFilename(QString const & filename)
{
    ui->txtFile->setText(filename);
}

QString CExportTr::tblBgColor() const
{
    return ui->cchTbl->bgColor();
}

QString CExportTr::tblFgColor() const
{
    return ui->cchTbl->fgColor();
}

QString CExportTr::hdrBgColor() const
{
    return ui->cchHead->bgColor();
}

QString CExportTr::hdrFgColor() const
{
    return ui->cchHead->fgColor();
}

QString CExportTr::textBgColor() const
{
    return ui->cchText->bgColor();
}

QString CExportTr::textFgColor() const
{
    return ui->cchText->fgColor();
}

QString CExportTr::itemBgColor() const
{
    return ui->cchCell->bgColor();
}

QString CExportTr::itemFgColor() const
{
    return ui->cchCell->fgColor();
}

bool CExportTr::linksToWWW() const
{
    return ui->rbWeb->isChecked();
}
