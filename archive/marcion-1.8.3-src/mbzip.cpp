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

#include "mbzip.h"

CMBzip::CMBzip(QString const & filename,
               CMessages * const messages)
        :filename(filename),
        messages(messages)
{
}

bool CMBzip::decompress(QString const & target) const
{
    QString fn2;
    if(target.isEmpty())
    {
        fn2=filename;
        fn2.remove(QRegExp(".bz2$"));
    }
    else
        fn2=target;

    QFile f2(fn2);

    FILE* f;
    BZFILE* b;
    int     nBuf;
    char    buf[1];
    int     bzerror;

    messages->MsgMsg(QObject::tr("decompressing '")+filename+"' ...");
    f=fopen(filename.toUtf8(),"rb");
    if(!f)
    {
        messages->MsgErr(QObject::tr("cannot open file '")+filename+"'");
        return false;
    }
    if(!f2.open(QIODevice::WriteOnly))
    {
        messages->MsgErr(QObject::tr("cannot open file '")+fn2+"'");
        fclose(f);
        return false;
    }

    b = BZ2_bzReadOpen ( &bzerror, f, 0,0, NULL, 0 );
    if ( bzerror != BZ_OK )
    {
      BZ2_bzReadClose ( &bzerror, b );

      messages->MsgErr(QObject::tr("decompressing error"));
      fclose(f);
      f2.close();
      return false;
    }

    bzerror = BZ_OK;
    while ( bzerror == BZ_OK )
    {
      nBuf = BZ2_bzRead ( &bzerror, b, buf, 1);
      //if ( bzerror == BZ_OK )
      //{
            if(f2.write(&buf[0],nBuf)<=0)
            {
                messages->MsgErr(QObject::tr("cannot write into file '")+fn2+"'");
                break;
            }
      //}
    }
    if ( bzerror != BZ_STREAM_END )
    {
       BZ2_bzReadClose ( &bzerror, b );
       messages->MsgErr(QObject::tr("reading failed"));
       fclose(f);
       f2.close();
       return false;
    } else {
       BZ2_bzReadClose ( &bzerror, b );
    }

    fclose(f);
    f2.close();

    if(f2.setPermissions(QFile::ReadUser|QFile::WriteUser|QFile::ReadGroup|QFile::WriteGroup|QFile::ReadOther))
        m_msg()->MsgMsg(QObject::tr("file '")+fn2+QObject::tr("' created successfully with permissions 0x")+QString::number(f2.permissions(),16));
    else
        m_msg()->MsgWarn(QObject::tr("file '")+fn2+QObject::tr("' created successfully, but setting permissions of the file failed. (current permissions: 0x")+QString::number(f2.permissions(),16)+")");

    return true;
}

bool CMBzip::compressToTmpdir(QString & result_name) const
{
    result_name=m_sett()->tmpDir()+QDir::separator()+QFileInfo(filename).fileName()+".bz2";
    return compress(result_name);
}

bool CMBzip::compress(QString const & target) const
{
    QString fn2;
    if(target.isEmpty())
    {
        fn2=filename;
        fn2.append(".bz2");
    }
    else
        fn2=target;

    QFile f2(filename);

    FILE*   f;
    BZFILE* b;
    int     nBuf=1;
    char    buf[1];
    int     bzerror;
    //int     nWritten;

    messages->MsgMsg(QObject::tr("compressing '")+filename+"' ...");
    f = fopen (fn2.toUtf8(), "wb" );
    if ( !f ) {
        messages->MsgErr(QObject::tr("cannot open file '")+fn2+"'");
        return false;
    }

    if(!f2.open(QIODevice::ReadOnly))
    {
        messages->MsgErr(QObject::tr("cannot open file '")+filename+"'");
        fclose(f);
        return false;
    }

    unsigned int bin,bout;
    b = BZ2_bzWriteOpen( &bzerror, f, 9 ,0,30);
    if (bzerror != BZ_OK) {
     BZ2_bzWriteClose ( &bzerror,b,0,&bin,&bout );

     messages->MsgErr(QObject::tr("compressing error"));
     fclose(f);
     f2.close();
     return false;
    }

    bzerror = BZ_OK;
    qint64 r;
    while ((r=f2.read(buf,1))>0)
    {
        if(r==-1)
        {
            messages->MsgErr(QObject::tr("reading failed"));
            break;
        }
        BZ2_bzWrite ( &bzerror, b, buf, nBuf );
        if (bzerror == BZ_IO_ERROR)
        {
            BZ2_bzWriteClose ( &bzerror, b,0,&bin,&bout );
            messages->MsgErr(QObject::tr("compressing error"));
            break;
        }
    }

    BZ2_bzWriteClose( &bzerror, b,0,&bin,&bout );
    if (bzerror == BZ_IO_ERROR) {
        messages->MsgErr(QObject::tr("compressing error"));
        fclose(f);
        f2.close();
        return false;
    }

    fclose(f);
    f2.close();

    m_msg()->MsgInf(QObject::tr("file '")+filename+QObject::tr("' compressed\nread: ")+QString::number(bin)+QObject::tr(" | write: ")+QString::number(bout)+QObject::tr(" | compression: ")+QString::number((double)(((double)bout/(double)bin)*(double)100),'g',6)+"%");
    return true;
}
