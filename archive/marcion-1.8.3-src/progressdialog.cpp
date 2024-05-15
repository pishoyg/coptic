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

#include "progressdialog.h"
#include "ui_progressdialog.h"

CProgressDialog::CProgressDialog(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::CProgressDialog),
    _stopped(false),
    _closeForced(false)
{
    ui->setupUi(this);
    //setWindowFlags(Qt::CustomizeWindowHint/*|Qt::WindowStaysOnTopHint*/);
    //setAttribute(Qt::WA_DeleteOnClose,false);

    IC_SIZES

    int const _h(height());
    setMinimumHeight(_h);
    setMaximumHeight(_h);

    ui->prgIcon->setPixmap(QPixmap(":/new/icons/icons/mlogo2.png"),MProgressIcon::Picture,_h);
    //ui->prgIcon->applyMask();
    //ui->prgIcon->useTimer(10);
}

CProgressDialog::~CProgressDialog()
{
    delete ui;
}

void CProgressDialog::changeEvent(QEvent *e)
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

void CProgressDialog::closeEvent ( QCloseEvent * event )
{
    if(_closeForced)
        event->accept();
    else
    {
        on_btStop_clicked();
        event->ignore();
    }
}

int  CProgressDialog::maximum() const
{
    return ui->pbrP->maximum();
}

void CProgressDialog::initProgress(QString const & text, int maximum,bool short_format)
{
    ui->lblText->setText(text);
    ui->pbrP->setMaximum(maximum);
    ui->prgIcon->setMaximum(maximum);
    if(short_format)
        ui->pbrP->setFormat("%p%");
}

void CProgressDialog::setTitle(QString const & text)
{
    ui->lblText->setText(text);
}

void CProgressDialog::incProgress()
{
    ui->pbrP->setValue(ui->pbrP->value()+1);
    ui->prgIcon->incValue();
    /*if(ui->pbrP->maximum()%ui->pbrP->value()==0)
    {
        update();
    }*/
    processEvents();
}

void CProgressDialog::processEvents() const
{
    QApplication::processEvents(QEventLoop::AllEvents);
}

void CProgressDialog::on_btStop_clicked()
{
    QMessageBox mb(QMessageBox::Question,tr("interrupt"),tr("abort ?"),QMessageBox::Yes|QMessageBox::No,this);
    if(mb.exec()==QMessageBox::Yes)
        _stopped=true;
}

bool CProgressDialog::stopped() const
{
    return _stopped;
}

void CProgressDialog::restart()
{
    _stopped=false;
}

void CProgressDialog::setProgress(int value)
{
    ui->pbrP->setValue(value);
    ui->prgIcon->setValue(value);
    processEvents();
}

void CProgressDialog::setProgress(int value,int maximum)
{
    ui->pbrP->setValue(value);
    ui->pbrP->setMaximum(maximum);
    ui->prgIcon->setMaximum(maximum);
    ui->prgIcon->setValue(value);
    processEvents();
}

bool CProgressDialog::close()
{
    _closeForced=true;
    return QWidget::close();
}
