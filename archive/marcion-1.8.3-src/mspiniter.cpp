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

#include "mspiniter.h"
#include "ui_mspiniter.h"

MSpinIter::MSpinIter(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MSpinIter)
{
    ui->setupUi(this);
}

MSpinIter::~MSpinIter()
{
    delete ui;
}

//

void MSpinIter::initSpecShorcuts()
{
    ui->tbFirst->setShortcut(QKeySequence("Ctrl+Shift+Home"));
    ui->tbLast->setShortcut(QKeySequence("Ctrl+Shift+End"));
    ui->tbPrev->setShortcut(QKeySequence("Ctrl+Shift+PgUp"));
    ui->tbNext->setShortcut(QKeySequence("Ctrl+Shift+PgDown"));
}

int MSpinIter::currentValue() const
{
    return ui->spinBox->value();
}

int MSpinIter::minValue() const
{
    return ui->spinBox->minimum();
}

int MSpinIter::maxValue() const
{
    return ui->spinBox->maximum();
}

void MSpinIter::setMaximumValue(int maximum)
{
    ui->spinBox->setMaximum(maximum);
    updateButtons();
}

void MSpinIter::setMinimumValue(int minimum)
{
    ui->spinBox->setMinimum(minimum);
    updateButtons();
}

void MSpinIter::setCurrentValue(int new_value)
{
    ui->spinBox->setValue(new_value);
    updateButtons();
    emit valueChanged(ui->spinBox->value(),Routine);
}

void MSpinIter::on_tbNext_clicked()
{
    int const v=ui->spinBox->value();
    if(v<ui->spinBox->maximum())
    {
        ui->spinBox->setValue(v+1);
        updateButtons();
        emit valueChanged(ui->spinBox->value(),Button);
    }
}

void MSpinIter::on_tbPrev_clicked()
{
    int const v=ui->spinBox->value();
    if(v>ui->spinBox->minimum())
    {
        ui->spinBox->setValue(v-1);
        updateButtons();
        emit valueChanged(ui->spinBox->value(),Button);
    }
}

void MSpinIter::on_tbFirst_clicked()
{
    int const v=ui->spinBox->value();
    if(v!=ui->spinBox->minimum())
    {
        ui->spinBox->setValue(ui->spinBox->minimum());
        updateButtons();
        emit valueChanged(ui->spinBox->value(),Button);
    }
}

void MSpinIter::on_tbLast_clicked()
{
    int const v=ui->spinBox->value();
    if(v!=ui->spinBox->maximum())
    {
        ui->spinBox->setValue(ui->spinBox->maximum());
        updateButtons();
        emit valueChanged(ui->spinBox->value(),Button);
    }
}

void MSpinIter::setLastVerseActive(bool enabled)
{
    ui->tbLast->setVisible(enabled);
}

void MSpinIter::on_spinBox_editingFinished()
{
    updateButtons();
    emit valueChanged(ui->spinBox->value(),Edit);
}

void MSpinIter::updateButtons()
{
    int const v=ui->spinBox->value(),
        max=ui->spinBox->maximum(),
        min=ui->spinBox->minimum();

    ui->tbFirst->setEnabled(false);
    ui->tbLast->setEnabled(false);
    ui->tbPrev->setEnabled(false);
    ui->tbNext->setEnabled(false);

    if(v>min)
    {
        ui->tbFirst->setEnabled(true);
        ui->tbPrev->setEnabled(true);
    }
    if(v<max)
    {
        ui->tbLast->setEnabled(true);
        ui->tbNext->setEnabled(true);
    }
}
