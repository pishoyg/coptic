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

#ifndef MTCPSERVER_H
#define MTCPSERVER_H

#include <QObject>
#include <QTcpServer>
#include <QTcpSocket>
#include <QHostAddress>
#include <QStringList>

#include "outstr.h"

class MTcpServer : public QObject
{
    Q_OBJECT
public:
    enum DataType{OpenFile=1,StopListen=2};
    explicit MTcpServer(QObject * parent=0);

    QTcpServer * server();

    bool hasError() const {return _error;}
    QString lastErrorStr() const {return _last_error_str;}
    QAbstractSocket::SocketError lastError() const {return _last_error;}

    void setHasError(bool error) {_error=error;}
    void setLastErrorStr(QString last_error_str) { _last_error_str=last_error_str;}
    void setLastError(QAbstractSocket::SocketError last_error) {_last_error=last_error;}

    bool checkServer(QString & output) const;
private:
    QTcpServer * _tcpServer;
    QTcpSocket * _sock;
    bool _error;
    QString _last_error_str;
    QAbstractSocket::SocketError _last_error;
private slots:
    void slot_newTcpConnection();
    void slot_tcpReadyRead();
signals:
    void incomingFileToOpen(QString filename);
    void serverStopped();
};

#endif // MTCPSERVER_H
