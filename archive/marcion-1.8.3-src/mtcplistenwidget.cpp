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

#include "mtcplistenwidget.h"
#include "ui_mtcplistenwidget.h"

MTcpListenWidget::MTcpListenWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MTcpListenWidget),
    _bgroup()
{
    ui->setupUi(this);
    _bgroup.setExclusive(true);
    _bgroup.addButton(ui->btStart);
    _bgroup.addButton(ui->btStop);

    checkServer();
    adjustSize();
}

MTcpListenWidget::~MTcpListenWidget()
{
    delete ui;
}

void MTcpListenWidget::on_btStart_clicked()
{
    if(ui->cbForce->isChecked())
    {
        USE_CLEAN_WAIT

        m_msg()->MsgMsg(tr("connecting 127.0.0.1:12873 ..."));
        QHostAddress h_addr_x("127.0.0.1");
        QTcpSocket tcp_sock;
        tcp_sock.connectToHost(h_addr_x,12873,QIODevice::ReadWrite);
        tcp_sock.waitForConnected(1000);
        if(!tcp_sock.isOpen())
            m_msg()->MsgErr(tr("connection to 127.0.0.1:12873 failed!\n\n")+ tcp_sock.errorString());
        else
        {
            m_msg()->MsgMsg(tr("sending request to TCP server shutdown (127.0.0.1:12873) ..."));
            MTcpServer::DataType dt(MTcpServer::StopListen);
            qint64 w=tcp_sock.write((char*)&dt,sizeof(dt));
            if(tcp_sock.waitForBytesWritten(1000))
            {
                if(w<0)
                    m_msg()->MsgErr(tr("Failed, cannot write data into stream! (127.0.0.1:12873)"));
            }
            else
                m_msg()->MsgErr(tr("Failed, cannot write data into stream! (127.0.0.1:12873)"));
        }
        tcp_sock.disconnectFromHost();
        m_msg()->MsgOk();
    }

    if(!CSettings::tcpServer->server()->isListening())
    {
        bool l=CSettings::tcpServer->server()->listen(QHostAddress("127.0.0.1"),12873);
        checkServer();
        if(l)
        {
            CSettings::tcpServer->setHasError(false);
            CSettings::tcpServer->setLastErrorStr(QString());
            CSettings::tcpServer->setLastError(QAbstractSocket::UnknownSocketError);
        }
        else
        {
            CSettings::tcpServer->setHasError(true);
            CSettings::tcpServer->setLastErrorStr(CSettings::tcpServer->server()->errorString());
            CSettings::tcpServer->setLastError(CSettings::tcpServer->server()->serverError());
        }
    }
}

void MTcpListenWidget::on_btStop_clicked()
{
    if(CSettings::tcpServer->server()->isListening())
    {
        CSettings::tcpServer->server()->close();
        checkServer();
    }
}

void MTcpListenWidget::checkServer()
{
    QString output;
    bool l=CSettings::tcpServer->checkServer(output);
    m_msg()->MsgMsg(output);
    ui->lblInfo->setText(output);
    ui->lblInfo->setToolTip(output);

    if(l)
        ui->btStart->setChecked(true);
    else
        ui->btStop->setChecked(true);
}
