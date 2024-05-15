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

#ifndef MCREATEARCHIVE_H
#define MCREATEARCHIVE_H

#include <QDialog>
#include <QFileDialog>
#include <QDir>
#include <QTreeWidgetItem>
#include <QMenu>
#include <QAction>

#include <sys/stat.h>

#include "settings.h"
#include "progressdialog.h"

namespace Ui {
    class MCreateArchive;
}

class MCrArItem : public QTreeWidgetItem
{
public:
    MCrArItem();
    ~MCrArItem(){}

    void setText();

    QString _name,_path,_strmode;
    mode_t _perm;
    off_t _size;
    bool _err;
};

class MCreateArchive : public QDialog
{
    Q_OBJECT

public:
    explicit MCreateArchive(QString const & name,
                            QString const & path,
                            QWidget *parent = 0);
    ~MCreateArchive();

    QString tgzPath() const {return tgz_path;}

    QList<MCrArItem*> items;
private slots:

    void on_btExamine_clicked();

    void on_btRmSel_clicked();

    void on_treeFiles_customContextMenuRequested(QPoint pos);

private:
    Ui::MCreateArchive *ui;
    QString tgz_path;

    QMenu popup;
    QAction *a_expand_all,*a_collapse_all;

    void readdir(QDir directory,MCrArItem *,unsigned int &);
};

#endif // MCREATEARCHIVE_H
