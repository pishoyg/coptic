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

#ifndef CMYSQL_H
#define CMYSQL_H

#include <stdio.h>

#include <QString>
#include <mysql.h>
#include <QTextStream>
#include <QFile>

#include "ctranslit.h"
#include "outstr.h"

#define MQUERY(MQ,MQTEXT) \
        CMySql MQ(MQTEXT); \
        if(m_msg()) m_msg()->MsgMsg(QObject::tr("executing query '")+MQTEXT+"' ..."); \
        if(!MQ.exec()) \
        { \
          m_msg()->MsgErr(MQ.lastError()); \
          return; \
        }

#define MQUERY_ENABL_MSG(MQ,MQTEXT) \
        CMySql MQ(MQTEXT); \
        messages->MsgMsg(QObject::tr("executing query '")+MQTEXT+"' ..."); \
        if(!MQ.exec()) \
        { \
          messages->MsgErr(MQ.lastError()); \
          messages->setMsgDisabled(false); \
          return; \
        }
/*#define MQUERY_ENABL_MSG_RESTC(MQ,MQTEXT) \
        CMySql MQ(MQTEXT); \
        messages->MsgMsg("executing query \""+MQTEXT+"\" ..."); \
        if(!MQ.exec()) \
        { \
          messages->MsgErr(MQ.lastError()); \
          messages->setMsgDisabled(false); \
          RESTCURSOR \
          return; \
        }*/
/*#define MQUERY_RESTC(MQ,MQTEXT) \
        CMySql MQ(MQTEXT); \
        messages->MsgMsg("executing query \""+MQTEXT+"\" ..."); \
        if(!MQ.exec()) \
        { \
          QApplication::restoreOverrideCursor(); \
          messages->MsgErr(MQ.lastError()); \
          return; \
        }*/

#define MQUERY_RF(MQ,MQTEXT) \
        CMySql MQ(MQTEXT); \
        if(m_msg())m_msg()->MsgMsg(QObject::tr("executing query '")+MQTEXT+"' ..."); \
        if(!MQ.exec()) \
        { \
          if(m_msg())m_msg()->MsgErr(MQ.lastError()); \
          return false; \
        }
/*#define MQUERY_RF_RESTC(MQ,MQTEXT) \
        CMySql MQ(MQTEXT); \
        messages->MsgMsg("executing query \""+MQTEXT+"\" ..."); \
        if(!MQ.exec()) \
        { \
          RESTCURSOR \
          messages->MsgErr(MQ.lastError()); \
          return false; \
        }*/
#define MQUERY_GETFIRST(MQ,MQTEXT) \
        CMySql MQ(MQTEXT); \
        if(m_msg()) m_msg()->MsgMsg(QObject::tr("executing query '")+MQTEXT+"' ..."); \
        if(!MQ.exec()) \
        { \
          if(m_msg()) m_msg()->MsgErr(MQ.lastError()); \
          return; \
        } \
        if(!MQ.first()) \
        { \
          if(m_msg()) m_msg()->MsgErr(QObject::tr("no row returned")); \
          return; \
        }
#define MQUERY_GETFIRST_RV(MQ,MQTEXT,RETVAL) \
        CMySql MQ(MQTEXT); \
        if(m_msg()) m_msg()->MsgMsg(QObject::tr("executing query '")+MQTEXT+"' ..."); \
        if(!MQ.exec()) \
        { \
          if(m_msg()) m_msg()->MsgErr(MQ.lastError()); \
          return RETVAL; \
        } \
        if(!MQ.first()) \
        { \
          if(m_msg()) m_msg()->MsgErr(QObject::tr("no row returned")); \
          return RETVAL; \
        }
#define MQUERY_GETFIRST_RF(MQ,MQTEXT) \
        CMySql MQ(MQTEXT); \
        messages->MsgMsg(QObject::tr("executing query '")+MQTEXT+"' ..."); \
        if(!MQ.exec()) \
        { \
          messages->MsgErr(MQ.lastError()); \
          return false; \
        } \
        if(!MQ.first()) \
        { \
          messages->MsgErr(QObject::tr("no row returned")); \
          return false; \
        }
/*#define MQUERY_GETFIRST_RF_RESTC(MQ,MQTEXT) \
        CMySql MQ(MQTEXT); \
        messages->MsgMsg("executing query \""+MQTEXT+"\" ..."); \
        if(!MQ.exec()) \
        { \
          RESTCURSOR \
          messages->MsgErr(MQ.lastError()); \
          return false; \
        } \
        if(!MQ.first()) \
        { \
          RESTCURSOR \
          messages->MsgErr("no row returned"); \
          return false; \
        }*/
#define MQUERY_RF_NOMSG(MQ,MQTEXT) \
        CMySql MQ(MQTEXT); \
        if(!MQ.exec()) \
        { \
          if(m_msg())m_msg()->MsgErr(MQTEXT+"\n"+MQ.lastError()); \
          return false; \
        }
/*#define MQUERY_RF_NOMSG_RESTC(MQ,MQTEXT) \
        CMySql MQ(MQTEXT); \
        if(!MQ.exec()) \
        { \
          RESTCURSOR \
          messages->MsgErr(MQTEXT+"\n"+MQ.lastError()); \
          return false; \
        }*/
#define MQUERY_NOMSG(MQ,MQTEXT) \
        CMySql MQ(MQTEXT); \
        if(!MQ.exec()) \
        { \
          m_msg()->MsgErr(MQTEXT+"\n"+MQ.lastError()); \
          return; \
        }

class CMySql
{
public:
    enum Dbase {Local,Remote};

    CMySql(Dbase dbase=Local);
    CMySql(QString const & command,Dbase dbase=Local);
    ~CMySql();

    static bool connect(QString const & host,
                        QString const & user,
                        QString const & password,
                        QString const & db,
                        unsigned int port),
        connect_local(
            QString const & host,
            QString const & user,
            QString const & password,
            QString const & db,
            unsigned int port),
        connect_local();

    static void close();

    bool exec(QString const & command);
    bool exec();
    bool execRealQuery(const char *stmt_str, unsigned long length);
    bool first(),next();
    bool isNULL(int index) const;
    QString value(int index) const;
    char * data(int index) const;
    QString escapedValue(int index) const;
    unsigned long long lastInsertId();
    QString lastInsertIdAsString();

    QString lastError() const;
    static QString last_Error();
    unsigned int size() const;
    unsigned int fieldCount() const;
    QString fieldName() const;
    bool hasResult() const;
    int fileToBlob(char const * cmd_begin,
                   char const * cmd_mid,
                   char const * cmd_end,
                   QString const & filename,
                   QString & output,
                   size_t & bytes,
                   char ** command_only=0,
                   size_t * query_length=0);

    //QString realEscape(const char *,unsigned long length) const;
    //static bool setVar(QString const & name,QString const & value);
    static QString lastConnectError() {return last_error;}

    static MYSQL * mysql,* r_mysql,*m_init,*m_r_init;
    static QString const delimiter,arch_delimiter,arch_delimiter_rq;
private:
    QString command;
    MYSQL_ROW row;
    MYSQL_RES * result;

    QString error;
    static QString last_error;
    Dbase dbase;

    inline MYSQL * p_mysql() const {return dbase==Local?mysql:r_mysql;}
};

#endif // CMYSQL_H
