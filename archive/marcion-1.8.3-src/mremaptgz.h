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

#ifndef MREMAPTGZ_H
#define MREMAPTGZ_H

#include <QWidget>
#include <QTreeWidgetItem>
#include <QFile>
#include <QRegExp>

#include "cmysql.h"
#include "settings.h"

namespace Ui {
    class MRemapTgz;
}

class MArchRemapItem : public QTreeWidgetItem
{
public:
    MArchRemapItem();
    ~MArchRemapItem(){}

    unsigned int _id;
    QString _work,_filename,_newname;

    void setText();
};

class MRemapTgz : public QWidget
{
    Q_OBJECT

public:
    explicit MRemapTgz(unsigned int id,
                       QString const & path,
                       QString const & title,
                       QWidget *parent = 0);
    ~MRemapTgz();

private slots:
    void on_btClose_clicked();

    void on_btStart_clicked();

    void on_treeItems_currentItemChanged(QTreeWidgetItem *current, QTreeWidgetItem *previous);

    void on_wdgDir_pathChanged(QString newpath);

private:
    Ui::MRemapTgz *ui;
    unsigned int const _id;
    QString const _path;

    void readItems();
signals:
    void remapped(unsigned int id);
};

#endif // MREMAPTGZ_H
