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

#include "mfsclip.h"

MFSClip::MFSClip() :
    QFileInfoList(),
    _state(None),
    _files(),
    _errs()
{
}

void MFSClip::clear()
{
    QFileInfoList::clear();
    _files.clear();
    _errs.clear();
    _state=None;
}

void MFSClip::printClipboard() const
{
    m_msg()->MsgMsg(QObject::tr("content of clipboard:"));
    for(int x=0;x<QFileInfoList::count();x++)
        m_msg()->MsgMsg(QFileInfoList::at(x).absoluteFilePath());
    QString msg(QObject::tr("items count: ")+QString::number(QFileInfoList::count())+QObject::tr("\nmode: "));
    switch(_state)
    {
    case None :
        msg.append("none");
        break;
    case Copy :
        msg.append("copy");
        break;
    case Cut :
        msg.append("cut");
        break;
    case Delete :
        msg.append("delete");
        break;
    }

    m_msg()->MsgInf(msg);
}

void MFSClip::cut(QFileInfo abs_fpath)
{
    QFileInfoList::append(abs_fpath);
    _state=Cut;
}

void MFSClip::copy(QFileInfo abs_fpath)
{
    QFileInfoList::append(abs_fpath);
    _state=Copy;
}

void MFSClip::remove(QFileInfo abs_fpath)
{
    QFileInfoList::append(abs_fpath);
    _state=Delete;
}

void MFSClip::scan_items()
{
    _files.clear();
    for(int x=0;x<QFileInfoList::count();x++)
    {
        QFileInfo const * fi(&QFileInfoList::at(x));

        _files.append(MFSInfo(fi->absoluteFilePath(),fi));
        if(fi->isDir()&&!fi->isSymLink())
            scan_dir(*fi,fi);
    }
}

void MFSClip::scan_dir(QFileInfo const & dir,QFileInfo const * base)
{
    MDirLister dl;
    dl.makeList(dir.absoluteFilePath());
    MFileInfoItemListPtr & fil(dl.items_sorted());
    //QFileInfoList fil=QDir(dir.absoluteFilePath()).entryInfoList(QDir::AllEntries|QDir::Hidden|QDir::System|QDir::NoDotAndDotDot);
    for(int x=0;x<fil.count();x++)
    {
        QFileInfo const * fi(fil.at(x));

        _files.append(MFSInfo(fi->absoluteFilePath(),base));
        if(fi->isDir()&&!fi->isSymLink())
            scan_dir(*fi,base);
    }
}

/*void MFSClip::read_dir(QDir from_dir,QDir target_dir,unsigned long & items,CProgressDialog & pd)
{
    QFileInfoList fil=from_dir.entryInfoList(QDir::AllEntries|QDir::Hidden|QDir::System|QDir::NoDotAndDotDot);
    for(int x=0;x<fil.count();x++)
    {
        QFileInfo fi(fil.at(x));
        items++;
        pd.incProgress();
        QString fn_from(fi.canonicalFilePath()),fn_to(target_dir.canonicalPath()+QDir::separator()+fi.fileName());
        if(fi.isDir())
        {
            if(_state!=Delete)
            {
                QString msg(QObject::tr("creating directory '")+fn_to+"' ...");
                m_msg()->MsgMsg(msg);
                if(target_dir.mkdir(fi.fileName()))
                {
                    if(!QFile(fn_to).setPermissions(QFile(fn_from).permissions()))
                    {
                        QString msg(QObject::tr("Warning: cannot set permissions for directory '")+fn_to+"' ...");
                        _errs.append(msg);
                        m_msg()->MsgMsg(msg);
                    }
                    read_dir(QDir(fn_from),QDir(fn_to),items,pd);
                    if(_state==Cut)
                    {
                        m_msg()->MsgMsg(QObject::tr("removing directory '")+fn_from+"' ...");
                        if(!QDir().rmdir(fn_from))
                        {
                            QString msg(QObject::tr("cannot remove directory '")+fn_to+"' ...");
                            _errs.append(msg);
                            m_msg()->MsgMsg(msg);
                        }
                    }
                }
                else
                {
                    msg.append(QObject::tr(" failed!"));
                    _errs.append(msg);
                    m_msg()->MsgMsg(QObject::tr("failed!"));
                }
            }
            else
            {
                read_dir(QDir(fn_from),QDir(),items,pd);
                QString msg(QObject::tr("removing directory '")+fn_from+"' ...");
                m_msg()->MsgMsg(msg);
                if(!QDir().rmdir(fi.canonicalFilePath()))
                {
                    msg.append(QObject::tr(" failed!"));
                    _errs.append(msg);
                    m_msg()->MsgMsg(QObject::tr("failed!"));
                }
            }
        }
        else
        {
            switch(_state)
            {
            case None :
                break;
            case Cut :
                {
                    QString msg(QObject::tr("moving '")+fn_from+"' -> '"+fn_to+"' ...");
                    m_msg()->MsgMsg(msg);
                    if(!QFile::rename(fn_from,fn_to))
                    {
                        msg.append(QObject::tr(" failed!"));
                        _errs.append(msg);
                        m_msg()->MsgMsg(QObject::tr("failed!"));
                    }
                    break;
                }
            case Copy :
                {
                    QString msg(QObject::tr("copying '")+fn_from+"' -> '"+fn_to+"' ...");
                    m_msg()->MsgMsg(msg);
                    if(!QFile::copy(fn_from,fn_to))
                    {
                        msg.append(QObject::tr(" failed!"));
                        _errs.append(msg);
                        m_msg()->MsgMsg(QObject::tr("failed!"));
                    }
                    else if(!QFile(fn_from).setPermissions(QFile(fn_to).permissions()))
                    {
                        QString msg(QObject::tr("Warning: cannot set permissions for file '")+fn_to+"' ...");
                        _errs.append(msg);
                        m_msg()->MsgMsg(msg);
                    }
                    break;
                }
            case Delete :
                {
                    QString msg(QObject::tr("deleting '")+fn_from+" ...");
                    m_msg()->MsgMsg(msg);
                    if(!QFile::remove(fn_from))
                    {
                        msg.append(QObject::tr(" failed!"));
                        _errs.append(msg);
                        m_msg()->MsgMsg(QObject::tr("failed!"));
                    }
                    break;
                }
            }
        }
        if(pd.stopped())
            return;
    }
}*/

bool MFSClip::moveItems(QDir const & target_dir,bool & interrupted)
{
    unsigned long const items(QFileInfoList::count());
    unsigned long r_items(0);
    CProgressDialog pd;
    pd.initProgress(QObject::tr("moving ..."),items);
    pd.show();

    QFileInfoList fi_list;
    for(unsigned int x=0;x<items;x++)
    {
        QFileInfo const * fi(&QFileInfoList::at(x));
        pd.incProgress();

        QString fn_from(fi->absoluteFilePath()),fn_to(target_dir.absolutePath()+QDir::separator()+fi->fileName());

        QString msg(QObject::tr("moving '")+fn_from+"' -> '"+fn_to+"' ...");
        m_msg()->MsgMsg(msg);
        if(!QFile::rename(fn_from,fn_to))
        {
            //msg.append(QObject::tr(" failed!"));
            //_errs.append(msg);
            fi_list.append(*fi);
            m_msg()->MsgMsg(QObject::tr("failed!"));
        }
        else
            r_items++;

        if(pd.stopped())
        {
            m_msg()->MsgInf(QObject::tr("interrupted, ")+QObject::tr("items moved: ")+QString::number(r_items)+QObject::tr(" from ")+QString::number(items));
            return interrupted=true;
        }
    }

    m_msg()->MsgMsg(QObject::tr("items moved: ")+QString::number(r_items)+QObject::tr(" from ")+QString::number(items));

    QFileInfoList::operator=(fi_list);
    interrupted=false;
    return (fi_list.count()==0);
}

bool MFSClip::paste(QDir target_dir/*,QString const & names*/)
{
    QString dtitle,qmsg,names;
    bool targ(true);
    switch(_state)
    {
    case None :
        return false;
        break;
    case Cut :
        dtitle=QObject::tr("cut");
        qmsg=QObject::tr("Moving ");
        break;
    case Copy :
        dtitle=QObject::tr("copy");
        qmsg=QObject::tr("Copying ");
        break;
    case Delete :
        dtitle=QObject::tr("delete");
        qmsg=QObject::tr("Deleting ");
        targ=false;
        break;
    }

    for(int x=0;x<QFileInfoList::count();x++)
        names.append(QFileInfoList::at(x).absoluteFilePath()+"\n");
    if(targ)
        names.append("\n"+QObject::tr("TO ")+target_dir.absolutePath()+"\n");

    QMessageBox mb(QMessageBox::Question,dtitle+QObject::tr(" items"),qmsg+QObject::tr(" items:\n\n")+names+QObject::tr("\nContinue?"),QMessageBox::Ok|QMessageBox::Cancel);
    if(mb.exec()!=QMessageBox::Ok)
    {
        if(_state==Delete)
            clear();
        return false;
    }

    QString _target(target_dir.absolutePath());
    if(!target_dir.exists())
    {
        m_msg()->MsgErr(QObject::tr("target directory '")+_target+"' does not exist!");
        return false;
    }

    USE_CLEAN_WAIT

    if(_state==Cut)
    {
        bool interrupted(false);
        bool r=moveItems(target_dir,interrupted);
        if(r||interrupted)
            return true;
        else
            m_msg()->MsgMsg(QObject::tr("some items cannot be renamed, there are still ")+QString::number(QFileInfoList::count())+QObject::tr(" items to process"));
    }

    scan_items();

    unsigned long const items(_files.count());
    unsigned long r_items(0);
    CProgressDialog pd;
    switch(_state)
    {
    case None :
        break;
    case Cut :
        pd.initProgress(QObject::tr("moving ..."),items);
        break;
    case Copy :
        pd.initProgress(QObject::tr("copying ..."),items);
        break;
    case Delete :
        pd.initProgress(QObject::tr("deleting ..."),items);
        break;
    }
    pd.show();
    m_msg()->MsgMsg(QObject::tr("paste ")+QString::number(items)+QObject::tr(" items"));

    for(unsigned int x=0;x<items;x++)
    {
        MFSInfo const * fi(&_files.at(x));

        r_items++;
        pd.incProgress();

        QString fn_from(fi->absoluteFilePath()),fn_to(target_dir.absolutePath()+QDir::separator()+fi->relativeToItem());

        if(fi->isDir()&&!fi->isSymLink())
        {
            if(_state!=Delete)
            {
                QString msg(QObject::tr("creating directory '")+fn_to+"' ...");
                m_msg()->MsgMsg(msg);
                if(fi->isSymLink())
                {
                    QString ltg(linkTarget(*fi)),
                            msgsl(QObject::tr("creating link '")+fn_to+QObject::tr("', target: '")+ltg+"' ...");
                    m_msg()->MsgMsg(msgsl);
                    if(!QFile::link(ltg,fn_to))
                    {
                        msgsl.append(QObject::tr(" failed!"));
                        _errs.append(msgsl);
                        m_msg()->MsgMsg(QObject::tr("failed!"));
                    }
                }
                else
                {
                    if(QDir().mkdir(fn_to))
                    {
                        if(!QFile(fn_to).setPermissions(fi->permissions()))
                        {
                            QString msg(QObject::tr("Warning: cannot set permissions for directory '")+fn_to+"' ...");
                            _errs.append(msg);
                            m_msg()->MsgMsg(msg);
                        }
                    }
                    else
                    {
                        msg.append(QObject::tr(" failed!"));
                        _errs.append(msg);
                        m_msg()->MsgMsg(QObject::tr("failed!"));
                    }
                }
            }
        }
        else
        {
            switch(_state)
            {
            case None :
                break;
            case Cut :
            /*{
                QString msg(QObject::tr("moving '")+fn_from+"' -> '"+fn_to+"' ...");
                m_msg()->MsgMsg(msg);
                if(!QFile::rename(fn_from,fn_to))
                {
                    msg.append(QObject::tr(" failed!"));
                    _errs.append(msg);
                    m_msg()->MsgMsg(QObject::tr("failed!"));
                }
                break;
            }*/
            case Copy :
                {
                    QString msg(QObject::tr("copying '")+fn_from+"' -> '"+fn_to+"' ...");
                    m_msg()->MsgMsg(msg);

                    if(fi->isSymLink())
                    {
                        QString ltg(linkTarget(*fi)),
                                msgsl(QObject::tr("creating link '")+fn_to+QObject::tr("', target: '")+ltg+"' ...");
                        m_msg()->MsgMsg(msgsl);
                        if(!QFile::link(ltg,fn_to))
                        {
                            msgsl.append(QObject::tr(" failed!"));
                            _errs.append(msgsl);
                            m_msg()->MsgMsg(QObject::tr("failed!"));
                        }
                    }
                    else
                    {
                        if(!QFile::copy(fn_from,fn_to))
                        {
                            msg.append(QObject::tr(" failed!"));
                            _errs.append(msg);
                            m_msg()->MsgMsg(QObject::tr("failed!"));
                        }
                        else if(!QFile(fn_to).setPermissions(fi->permissions()))
                        {
                            QString msg(QObject::tr("Warning: cannot set permissions for file '")+fn_to+"' ...");
                            _errs.append(msg);
                            m_msg()->MsgMsg(msg);
                        }
                        else if(_state==Cut)
                            goto lbl_delete;
                    }
                    break;
                }
            case Delete :
                {
                lbl_delete:
                    QString msg(QObject::tr("deleting '")+fn_from+"' ...");
                    m_msg()->MsgMsg(msg);
                    if(!QFile::remove(fn_from))
                    {
                        msg.append(QObject::tr(" failed!"));
                        _errs.append(msg);
                        m_msg()->MsgMsg(QObject::tr("failed!"));
                    }
                    break;
                }
            }
        }
        if(pd.stopped())
        {
            m_msg()->MsgInf(QObject::tr("interrupted, ")+QObject::tr("items completed: ")+QString::number(r_items)+QObject::tr(" from ")+QString::number(items));
            return true;
        }
    }

    if(_state==Cut||_state==Delete)
        for(int x=((long)items)-1;x>=0;x--)
        {
            MFSInfo const * fi(&_files.at(x));
            if(fi->isDir()&&!fi->isSymLink())
            {
                m_msg()->MsgMsg(QObject::tr("removing directory '")+fi->absoluteFilePath()+"' ...");
                if(!QDir().rmdir(fi->absoluteFilePath()))
                {
                    QString msg(QObject::tr("cannot remove directory '")+fi->absoluteFilePath()+"' ...");
                    _errs.append(msg);
                    m_msg()->MsgMsg(msg);
                }
            }
        }

    m_msg()->MsgMsg(QString::number(r_items)+QObject::tr(" completed"));
    printErrs();
    if(_state==Cut||_state==Delete)
        clear();
    return true;
}

/*unsigned long MFSClip::count_dir() const
{
    unsigned long items(0);
    for(int x=0;x<QFileInfoList::count();x++)
    {
        QFileInfo fi(QFileInfoList::at(x));
        items++;
        if(fi.isDir())
            count_dir2(QDir(fi.canonicalFilePath()),items);
    }
    return items;
}

void MFSClip::count_dir2(QDir dir,unsigned long & items) const
{
    QFileInfoList fil(dir.entryInfoList(QDir::AllEntries|QDir::Hidden|QDir::System|QDir::NoDotAndDotDot));
    for(int x=0;x<fil.count();x++)
    {
        QFileInfo fi(fil.at(x));
        items++;
        if(fi.isDir())
            count_dir2(QDir(fi.canonicalFilePath()),items);
    }
}*/

void MFSClip::printErrs()
{
    int c(_errs.count());
    if(c==0)
        m_msg()->MsgMsg(QObject::tr("finished, no errors"));
    else
    {
        m_msg()->MsgInf(QObject::tr("finished, ")+QString::number(c)+QObject::tr(" errors occurred"));
        m_msg()->MsgMsg(_errs.join("\n"));
    }
}

QString MFSClip::linkTarget(QFileInfo const & fileinfo)
{
#ifndef Q_WS_WIN
    int size(0xff);
    char * buffer(0);

    while(true)
    {
        if(buffer)
            delete [] buffer;
        buffer = new char[size];
        if(buffer)
        {
            int nchars = readlink(fileinfo.absoluteFilePath().toUtf8().constData(), buffer, size);
            if(nchars<0)
            {
                if(buffer)
                    delete [] buffer;
                return QString();
            }
            if(nchars<size)
            {
                buffer[nchars]=0;
                QString rv(buffer);
                delete [] buffer;
                return rv;
            }
            size*=2;
        }
        else
            return QString();
    }
#else
    return QString();
#endif
}

/*bool MFSClip::createLink(QFileInfo const & fileinfo,QString const & target)
{
    return (symlink(fileinfo.absoluteFilePath().toUtf8().data(),target.toUtf8().data())==0);
}*/

// MFSInfo

MFSInfo::MFSInfo(QString const & path,QFileInfo const * base) :
    QFileInfo(path),
    _base(base)
{
}

MFSInfo::MFSInfo(MFSInfo const & other) :
    QFileInfo(other),
    _base(other._base)
{
}

/*MFSInfo MFSInfo::operator=(MFSInfo const & other)
{
    *this=other;
    _rel=other._rel;
    return *this;
}*/

QString MFSInfo::relativeToItem() const
{
    return absoluteFilePath().remove(QRegExp(QString("^")+QRegExp::escape(_base->absolutePath()+QDir::separator())));
}

// MDirLister

MDirLister::MDirLister() :
    _dir(0),
    _dir_entry(0),
    _dirname(),
    _error_text(),
    _files(),
    _sorted()
{

}

int MDirLister::countFilesInDir(QString const & dirname)
{
    int count(0);
    DIR * dir=opendir(dirname.toUtf8().data());
    if(dir)
    {
        dirent * entry(0);
        while((entry=readdir(dir))){
            if(!(strcmp(entry->d_name,".")==0||strcmp(entry->d_name,"..")==0))
            {
                struct stat stat_entry;
                QString const fullname(dirname+QDir::separator()+QString::fromUtf8(entry->d_name));
                stat(fullname.toUtf8().data(),&stat_entry);
                count++;
                if(S_ISDIR(stat_entry.st_mode))
                    count+=countFilesInDir(fullname);
            }
        }
        closedir(dir);
    }
    return count;
}

/*int MDirLister::count_files_in_dir(QString const & dirname)
{
    int count(0);
    DIR * dir=opendir(dirname.toUtf8().data());
    dirent * entry(0);
    while((entry=readdir(dir))){
        if(!(strcmp(entry->d_name,".")==0||strcmp(entry->d_name,"..")==0))
        {
            count++;
            if(entry->d_type==DT_DIR)
                count+=count_files_in_dir(QString(dirname+QDir::separator()+QString::fromUtf8(entry->d_name)),count);
        }
    }
    closedir(dir);
    return count;
}*/

bool MDirLister::openDir(QString const & dirname)
{
    _dirname=dirname;
    _dir=0;
    _dir_entry=0;

    _dir=opendir(_dirname.toUtf8().data());
    if(!_dir)
        _error_text=QString(QObject::tr("cannot scan directory '")+_dirname+"'");
    return _dir;
}

bool MDirLister::closeDir()
{
    int r=closedir(_dir);
    if(r==-1)
        _error_text=QString(QObject::tr("cannot close directory stream!"));
    return (r!=-1);
}

bool MDirLister::readDir()
{
    read_again:
    _dir_entry=readdir(_dir);
    if(!_dir_entry)
    {
        closeDir();
        return false;
    }
    if(strcmp(_dir_entry->d_name,".")==0||strcmp(_dir_entry->d_name,"..")==0)
        goto read_again;
    return true;
}

QString MDirLister::dirItemName() const
{
    return QString::fromUtf8(_dir_entry->d_name);
}

QByteArray MDirLister::dirItemNameRaw() const
{
    return QByteArray(_dir_entry->d_name);
}

QString MDirLister::dirItemPath(bool add_separator) const
{
    QString path(_dirname);
    if(add_separator)
        path.append(QDir::separator());
    path.append(dirItemName());
    return path;
}

MFileInfoItem MDirLister::dirItem() const
{
    MFileInfoItem mfi(dirItemPath(true));
    mfi._raw_name=dirItemNameRaw();
    return mfi;
}

int MDirLister::makeList(QString const & dirname)
{
    _sorted.clear();
    _files.clear();

    MFileInfoItemListPtr unsorted_f,unsorted_d;
    if(openDir(dirname))
    {
        while(readDir())
            _files.append(dirItem());

        for(int x=0;x<_files.count();x++)
        {
            MFileInfoItem const * fi(&_files.at(x));
            if(fi->isDir())
                unsorted_d.append(fi);
            else
                unsorted_f.append(fi);
        }
    }

    MFileInfoItemListPtr * fi_lists[]={&unsorted_d,
                                  &unsorted_f,
                                  0};
    for(MFileInfoItemListPtr ** clist=&fi_lists[0];
        *clist;clist++)
        while((*clist)->count()>0)
        {
            MFileInfoItem const* first((*clist)->first());

            int findex=0;
            for(int x=0;x<(*clist)->count();x++)
            {
                MFileInfoItem const * cur((*clist)->at(x));
                if(cur!=first)
                    if(QString::compare(first->fileName(),cur->fileName(),Qt::CaseSensitive)>0)
                    {
                        first=cur;
                        findex=x;
                    }
            }

            _sorted.append(first);
            (*clist)->removeAt(findex);
        }

    return _sorted.count();
}

// MFileInfoItem

MFileInfoItem::MFileInfoItem(QString const & file) :
    QFileInfo(file),
    _raw_name()
{

}

MFileInfoItem::MFileInfoItem(MFileInfoItem const & other) :
    QFileInfo(other),
    _raw_name(other._raw_name)
{

}

MFileInfoItem & MFileInfoItem::operator=(MFileInfoItem const & other)
{
    QFileInfo::operator=(other);
    _raw_name=other._raw_name;
    return *this;
}
