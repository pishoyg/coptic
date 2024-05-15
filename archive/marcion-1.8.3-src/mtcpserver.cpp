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

#include "mtcpserver.h"

MTcpServer::MTcpServer(QObject * parent) :
    QObject(parent),
    _tcpServer(new QTcpServer()),
    _sock(0),
    _error(false),
    _last_error_str(),
    _last_error(QAbstractSocket::UnknownSocketError)
{
    if(_tcpServer)
        QObject::connect(_tcpServer,SIGNAL(newConnection()),this,SLOT(slot_newTcpConnection()));
}

QTcpServer * MTcpServer::server()
{
    return _tcpServer;
}

void MTcpServer::slot_newTcpConnection()
{
    OSTREAM << QObject::tr("TCP server: new connection\n");
    OSTREAM.flush();

    if(_sock)
    {
        disconnect(_sock,SIGNAL(readyRead()),this,SLOT(slot_tcpReadyRead()));
        _sock=0;
    }
    _sock=_tcpServer->nextPendingConnection();
    if(_sock)
    {
        connect(_sock,SIGNAL(readyRead()),this,SLOT(slot_tcpReadyRead()));
    }
    else
    {
        OSTREAM << QObject::tr("TCP server: no connection available!\n");
        OSTREAM.flush();
    }
}

void MTcpServer::slot_tcpReadyRead()
{
    if(_sock)
    {
        qint64 bc(_sock->bytesAvailable());

        OSTREAM << QObject::tr("TCP server: incoming data ")+QString::number(bc)+" B\n";
        OSTREAM.flush();

        if(bc>=sizeof(DataType))
        {
            DataType data_type;
            _sock->read((char*)&data_type,sizeof(DataType));
            switch(data_type)
            {
            case OpenFile :
                {
                    QString s(QString::fromUtf8(_sock->readAll()));
                    QStringList sl(s.split(QString("<*file*separator*>"),QString::SkipEmptyParts));
                    for(int x=0;x<sl.count();x++)
                        emit incomingFileToOpen(sl.at(x));

                    _sock->write((char*)&bc,sizeof(qint64));

                    break;
                }
            case StopListen :
                {
                    _sock->readAll();
                    _tcpServer->close();
                    emit serverStopped();
                    _sock->write((char*)&bc,sizeof(qint64));
                    break;
                }
            }
        }
        else
        {
            OSTREAM << QObject::tr("TCP server: error, too few bytes!");
            OSTREAM.flush();
        }
    }
}

bool MTcpServer::checkServer(QString & output) const
{
    bool l(_tcpServer->isListening());
    output=QObject::tr("listening on ");
    output.append(_tcpServer->serverAddress().toString());
    output.append(":");
    output.append(QString::number(_tcpServer->serverPort()));
    if(l)
        output.append(QObject::tr(" YES"));
    else
        output.append(QObject::tr(" NO"));
    return l;
}
