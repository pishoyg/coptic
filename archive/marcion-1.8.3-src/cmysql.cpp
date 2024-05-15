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

#include "cmysql.h"

MYSQL * CMySql::mysql(0);
MYSQL * CMySql::r_mysql(0);
MYSQL * CMySql::m_init(0);
MYSQL * CMySql::m_r_init(0);

QString const CMySql::delimiter(";;;***;;;\n");
QString const CMySql::arch_delimiter("<!*marcion-archive-export-file-delimiter*!>");
QString const CMySql::arch_delimiter_rq("<!*real-query*!>");

QString CMySql::last_error=QString();

CMySql::CMySql(Dbase dbase)
        :command(),result(0),dbase(dbase)
{
}

CMySql::CMySql(QString const & command,Dbase dbase)
        :command(command),result(0),dbase(dbase)
{
}

CMySql::~CMySql()
{
    if(result)
        mysql_free_result(result);
}

int CMySql::fileToBlob(char const * cmd_begin,
                       char const * cmd_mid,
                       char const * cmd_end,
                       QString const & filename,
                       QString & output,
                       size_t & bytes,
                       char ** command_only,
                       size_t * query_length)
{
    FILE * f;
    f=fopen(filename.toUtf8(),"rb");
    if(!f)
    {
        output=QString(QObject::tr("cannot open file '")+filename+"'");
        return -3;
    }

    if(fseek(f,0,SEEK_END)!=0)
    {
        fclose(f);
        output=QString(QObject::tr("fseek() failed"));
        return -4;
    }

    long int const fsize=ftell(f);

    size_t const cmd_begin_len=strlen(cmd_begin),
            cmd_mid_len=strlen(cmd_mid),
            cmd_end_len=strlen(cmd_end);
    char * to=new char[(fsize*2)+1+cmd_begin_len+cmd_mid_len+cmd_end_len+22],
            *file_to=new char[(fsize*2)+1],
            *end;

    if(!(to&&file_to))
    {
        fclose(f);
        output=QString(QObject::tr("out of memory"));
        if(to)delete [] to; if(file_to)delete [] file_to;
        return -1;
    }

    if(fseek(f,0,SEEK_SET)!=0)
    {
        fclose(f);
        output=QString(QObject::tr("fseek() failed"));
        if(to)delete [] to; if(file_to)delete [] file_to;
        return -4;
    }

    size_t const real_size=bytes=fread(file_to,1,fsize,f);

    output.append(QObject::tr("bytes for reading: ")+QString::number(fsize)+QObject::tr(" | read: ")+QString::number(real_size)+QObject::tr(" | diff: ")+QString::number(real_size-fsize)+"\n");
    if(real_size!=(size_t)fsize)
    {
        fclose(f);
        output.append(QString(QObject::tr("reading failed: '")+filename+"'"));
        if(to)delete [] to; if(file_to)delete [] file_to;
        return -2;
    }
    fclose(f);

    QByteArray fsize_str(QString::number(fsize).toUtf8());
#ifdef Q_WS_WIN
    end=strcpy(to,cmd_begin)+cmd_begin_len;
    end=strcpy(end,fsize_str.data())+strlen(fsize_str.data());
    end=strcpy(end,cmd_mid)+cmd_mid_len;
    output.append(QObject::tr("command: '")+QString(to)+QString("<binary-data>")+QString(cmd_end)+"'\n");
    unsigned long l2=mysql_real_escape_string(p_mysql(),end,file_to,real_size);
    end+=l2;
    end=strcpy(end,cmd_end)+cmd_end_len;
#else
    end=stpcpy(to,cmd_begin);
    end=stpcpy(end,fsize_str.data());
    end=stpcpy(end,cmd_mid);
    output.append(QObject::tr("command: '")+QString(to)+QString("<binary-data>")+QString(cmd_end)+"'\n");
    unsigned long l2=mysql_real_escape_string(p_mysql(),end,file_to,real_size);
    end+=l2;
    end=stpcpy(end,cmd_end);
#endif

    const size_t q_length=cmd_begin_len+cmd_mid_len+cmd_end_len+fsize_str.length()+l2;
    if(query_length)
        (*query_length)=q_length;

    if(!command_only)
    {
        mysql_real_query(p_mysql(),to,q_length);
        int e=mysql_errno(p_mysql());
        if(e==0)
            result=mysql_store_result(p_mysql());
        else
        {
            output.append(error=QString::number(e)+": "+QString(mysql_error(p_mysql())));
            if(to)delete [] to; if(file_to)delete [] file_to;
            return -5;
        }

        output.append(QObject::tr("successfully imported"));

        if(to)delete [] to; if(file_to)delete [] file_to;
    }
    else
    {
        output.append(QObject::tr("successfully prepared"));
        if(file_to)delete [] file_to;
        *command_only=to;
    }

    return 0;
}

bool CMySql::exec(QString const & command)
{
    mysql_query(p_mysql(), command.toUtf8().data());
    int e=mysql_errno(p_mysql());
    if(e==0)
        result=mysql_store_result(p_mysql());
    else
    {
        error=QString::number(e)+": "+QString(mysql_error(p_mysql()));
        return false;
    }
    return true;
}

bool CMySql::execRealQuery(const char * stmt_str, unsigned long length)
{
    mysql_real_query(p_mysql(), stmt_str, length);
    int e=mysql_errno(p_mysql());
    if(e==0)
        result=mysql_store_result(p_mysql());
    else
    {
        error=QString::number(e)+": "+QString(mysql_error(p_mysql()));
        return false;
    }
    return true;
}

bool CMySql::exec()
{
    return exec(command);
}

bool CMySql::first()
{
    return next();
}

bool CMySql::next()
{
    if((row=mysql_fetch_row(result)))
        return true;
    return false;
}

bool CMySql::isNULL(int index) const
{
    return !row[index];
}

QString CMySql::value(int index) const
{
    if(row[index])
        return QString::fromUtf8(row[index]);
    else
        return QString();
}

char * CMySql::data(int index) const
{
    return row[index];
}

QString CMySql::escapedValue(int index) const
{
    return CTranslit::escaped(value(index));
}

QString CMySql::lastError() const
{
    return error;
}

unsigned int CMySql::size() const
{
    return mysql_num_rows(result);
}

unsigned int CMySql::fieldCount() const
{
    return mysql_num_fields(result);
}

bool CMySql::connect(QString const & host,
                        QString const & user,
                        QString const & password,
                        QString const & db,
                        unsigned int port)
{
    CMySql::m_r_init = mysql_init(0);
   mysql_options(CMySql::m_r_init, MYSQL_READ_DEFAULT_GROUP, "client");

    CMySql::r_mysql=mysql_real_connect(m_r_init,
        host.toUtf8().data(),
        user.toUtf8().data(),
        password.toUtf8().data(),
        db.toUtf8().data(),
        port,NULL,0);

    int e=mysql_errno(m_r_init);
    if(e!=0)
    {
        last_error=QString::number(e)+": "+QString(mysql_error(m_r_init));
        CMySql::close();
        return false;
    }
    return true;
}

void CMySql::close()
{
    //mysql_close(CMySql::r_mysql);
    mysql_close(CMySql::m_r_init);
}

bool CMySql::connect_local(
    QString const & host,
    QString const & user,
    QString const & password,
    QString const & db,
    unsigned int port)
{
    CMySql::mysql=mysql_real_connect(m_init, host.toUtf8().constData(),user.toUtf8().constData(),password.toUtf8().constData(), db.toUtf8().constData(), port,NULL,0);

    OSTREAM << "mysql_real_connect(" << host << "," << user << "," << password << "," << db << ",NULL,0) ... ";

    int e=mysql_errno(m_init);
    if(e!=0)
    {
        OSTREAM << "Failed!\n";
        last_error=QString::number(e)+": "+QString(mysql_error(m_init));
        return false;
    }
    OSTREAM << "OK\n";
    OSTREAM << "MySql server: " << QString(mysql_get_server_info(mysql)) << "\n\n";
    OSTREAM.flush();
    //printf("MySql host: %s\n",mysql_get_host_info(m_init));
    return true;
}

bool CMySql::connect_local()
{
    CMySql::mysql=mysql_real_connect(m_init, "127.0.0.1","marcion","marcion", "marcion", 0,NULL,0);

    int e=mysql_errno(m_init);
    if(e!=0)
    {
        OSTREAM << "mysql_real_connect() failed\n";
        OSTREAM.flush();
        last_error=QString::number(e)+": "+QString(mysql_error(m_init));
        return false;
    }
    OSTREAM << "mysql_real_connect() OK\n";
    OSTREAM.flush();
    return true;
}

/*bool CMySql::setVar(QString const & name,QString const & value)
{
    QString cmd("set session "+name+"='"+value+"'");
    CMySql q(cmd);
    return q.exec();
}*/

QString CMySql::last_Error()
{
    return last_error;
}

bool CMySql::hasResult() const
{
    return result!=0;
}

QString CMySql::fieldName() const
{
    MYSQL_FIELD *field;
    field = mysql_fetch_field(result);
    if(field)
        return QString(field->name);
    else
        return QString();
}

/*QString CMySql::realEscape(const char * from,unsigned long length) const
{
    char * to=new char((length*2)+1);
    mysql_real_escape_string(p_mysql(),to,from,length);
    QString r(to);
    delete to;
    return r;
}*/

unsigned long long CMySql::lastInsertId()
{
    return (unsigned long long)mysql_insert_id(mysql);
}

QString CMySql::lastInsertIdAsString()
{
    return QString::number(lastInsertId());
}
