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

#include "mlibsearchtitle.h"
#include "ui_mlibsearchtitle.h"

MLibSearchTitle::MLibSearchTitle(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MLibSearchTitle)
{
    ui->setupUi(this);

    ui->label->setText(tr("search in library"));
    on_cbLimit_toggled(ui->cbLimit->isChecked());

    IC_SIZES
}

MLibSearchTitle::~MLibSearchTitle()
{
    delete ui;
}

//

void MLibSearchTitle::setQueryLimit()
{
    if(m_sett())
        ui->spnLimit->setValue(m_sett()->queryResultsCount());
}

void MLibSearchTitle::on_btRefresh_clicked()
{
    emit request(Refresh);
}

void MLibSearchTitle::on_btQuery_clicked()
{
    emit request(Query);
}

void MLibSearchTitle::on_btHide_clicked()
{
    emit hide();
}

bool MLibSearchTitle::isWord() const
{
    return ui->rbWord->isChecked();
}

bool MLibSearchTitle::isPhrase() const
{
    return ui->rbPhrase->isChecked();
}

bool MLibSearchTitle::acceptSpc() const
{
    return ui->cbPhraseSpc->isChecked();
}

int MLibSearchTitle::page() const
{
    return ui->spnPage->value();
}

int MLibSearchTitle::limit() const
{
    return ui->spnLimit->value();
}

void MLibSearchTitle::setLibIndex(int index)
{
    switch(index)
    {
    case 0 :
        ui->frmLimit->setEnabled(true);
        ui->fmPW->setEnabled(true);
        ui->spnPage->setEnabled(true);
        //stwInput->setCurrentIndex(0);
        break;
    case 1 :
        ui->frmLimit->setEnabled(false);
        ui->fmPW->setEnabled(false);
        ui->spnPage->setEnabled(true);
        break;
    case 2 :
        ui->frmLimit->setEnabled(true);
        ui->fmPW->setEnabled(false);
        ui->spnPage->setEnabled(false);
        //stwInput->setCurrentIndex(1);
        break;
    }
}

void MLibSearchTitle::on_rbWord_toggled(bool checked)
{
    ui->cbPhraseSpc->setEnabled(!checked);
    emit request(StateChanged);
}

void MLibSearchTitle::on_rbPhrase_toggled(bool checked)
{
    ui->cbPhraseSpc->setEnabled(checked);
    emit request(StateChanged);
}

void MLibSearchTitle::on_cbLimit_toggled(bool checked)
{
    ui->frmLimit->setVisible(checked);
}
