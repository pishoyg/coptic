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

#include "mhistory.h"
#include "ui_mhistory.h"

MHistory::MHistory(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MHistory),
    history(),ci(-1)
{
    ui->setupUi(this);
}

MHistory::~MHistory()
{
    delete ui;
}

void MHistory::on_btFirst_clicked()
{
    ci=0;
    enableButtons();
    emit buttonClicked(ci);
}

void MHistory::on_btPrev_clicked()
{
    ci--;
    enableButtons();
    emit buttonClicked(ci);
}

void MHistory::on_btNext_clicked()
{
    ci++;
    enableButtons();
    emit buttonClicked(ci);
}

void MHistory::on_btLast_clicked()
{
    ci=history.count()-1;
    enableButtons();
    emit buttonClicked(ci);
}

void MHistory::enableButtons()
{
    if(history.count()<=1)
    {
        ui->btPrev->setEnabled(false);
        ui->btFirst->setEnabled(false);
        ui->btLast->setEnabled(false);
        ui->btNext->setEnabled(false);
        ui->btRefresh->setEnabled(false);
    }
    else
    {
        setEnabled(true);
        if(ci<0)
            ci=0;
        else if(ci>history.count()-1)
            ci=history.count()-1;

        ui->btPrev->setEnabled(true);
        ui->btFirst->setEnabled(true);
        ui->btLast->setEnabled(true);
        ui->btNext->setEnabled(true);
        ui->btRefresh->setEnabled(true);

        if(ci==0)
        {
            ui->btPrev->setEnabled(false);
            ui->btFirst->setEnabled(false);
        }
        else if(ci==history.count()-1)
        {
            ui->btNext->setEnabled(false);
            ui->btLast->setEnabled(false);
        }
    }

    if(history.isEmpty())
    {
        ui->lblPos->setText("0 / 0");
        ui->btRefresh->setEnabled(false);
    }
    else
    {
        ui->lblPos->setText(QString::number(ci+1)+" / "+QString::number(history.count()));
        ui->btRefresh->setEnabled(true);
    }
}

int MHistory::currentIndex() const
{
    return ci;
}

QString MHistory::text(int index) const
{
    return history.at(index);
}

void MHistory::append(QString const & text)
{
    history.append(text);
    ci=history.count()-1;
    enableButtons();
}

void MHistory::on_btRefresh_clicked()
{
    emit buttonClicked(ci);
}
