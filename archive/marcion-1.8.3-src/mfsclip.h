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

#ifndef MFSCLIP_H
#define MFSCLIP_H

#include <QDir>
#include <QFileInfo>
#include <QFileInfoList>
#include <QList>

#include <stdio.h>
//#include <sys/types.h>
#include <sys/stat.h>
#include <dirent.h>
#include <string.h>
#include <unistd.h>

#include "settings.h"
#include "progressdialog.h"

class MFileInfoItem : public QFileInfo
{
public:
    MFileInfoItem(QString const & file);
    MFileInfoItem(MFileInfoItem const & other);
    MFileInfoItem & operator=(MFileInfoItem const & other);
    using QFileInfo::operator==;

    QByteArray _raw_name;
};

typedef QList<MFileInfoItem> MFileInfoItemList;
typedef QList<MFileInfoItem const*> MFileInfoItemListPtr;

class MDirLister
{
public:
    MDirLister();
    ~MDirLister(){}

    bool openDir(QString const & dirname);
    bool closeDir();
    bool readDir();

    int makeList(QString const & dirname);
    MFileInfoItemListPtr & items_sorted(){return _sorted;}
    MFileInfoItemList & items(){return _files;}

    MFileInfoItem dirItem() const;
    QString dirItemName() const;
    QByteArray dirItemNameRaw() const;
    QString dirItemPath(bool add_separator=true) const;

    static int countFilesInDir(QString const & dirname);
private:
    DIR * _dir;
    struct dirent * _dir_entry;
    QString _dirname,_error_text;
    MFileInfoItemList _files;
    MFileInfoItemListPtr _sorted;

    //static void count_files_in_dir(QString const & dirname, int & count);
};

class MFSInfo : public QFileInfo
{
public:
    MFSInfo(QString const & rel_path,QFileInfo const * base);
    MFSInfo(MFSInfo const & other);
    ~MFSInfo(){}

    //MFSInfo operator=(MFSInfo const & other);

    inline QString relativeToItem() const;
    //void setRelativeToItem(QString const & rel_path);
private:
    //QString _rel;
    QFileInfo const * _base;
};

class MFSClip : public QFileInfoList
{
public:
    enum State{None,Cut,Copy,Delete};
    MFSClip();

    void clear();
    void printClipboard() const;
    void copy(QFileInfo abs_fpath);
    void cut(QFileInfo abs_fpath);
    void remove(QFileInfo abs_fpath);
    bool paste(QDir target_dir/*,QString const & names*/);
    State state() const {return _state;}
    void setState(State new_state) {_state=new_state;}
    bool moveItems(QDir const & target_dir,bool & interrupted);
    static QString linkTarget(QFileInfo const & fileinfo);
    //static void createLink(QFileInfo const & fileinfo,QString const & target);
    //static bool isLinkValid(QFileInfo const & fileinfo);
private:
    State _state;
    QList<MFSInfo> _files;
    mutable QStringList _errs;
    //void read_dir(QDir from_dir,QDir target_dir,unsigned long & items,CProgressDialog & pd);
    //unsigned long count_dir() const;
    //void count_dir2(QDir dir,unsigned long & items) const;
    void scan_items(),scan_dir(QFileInfo const & dir,QFileInfo const * base);
    void printErrs();
};

#endif // MFSCLIP_H
