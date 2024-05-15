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

#ifndef MARCHIVER_H
#define MARCHIVER_H

#include <QWidget>

#include <archive.h>
#include <archive_entry.h>

#include "settings.h"
#include "mcreatearchive.h"
#include "cmysql.h"
#include "progressdialog.h"

namespace Ui {
    class MArchiver;
}

class MArchiver : public QWidget
{
    Q_OBJECT

public:
    explicit MArchiver(QWidget *parent = 0);
    explicit MArchiver(unsigned int id,QString const & name,bool extended,QWidget *parent = 0);
    ~MArchiver();

    bool isValid() const {return _is_valid;}
    bool isListPrep() const {return _list_prepared;}
    void init(unsigned int id,bool allow_select);

    QString selectedFile() const;
    bool checkFilePath(QString const & filepath);
    unsigned int currentId() const {return _id;}
    unsigned int sizeOfTgz() const {return (unsigned int)_size;}
    QString nameOfTgz() const {return _name;}
private slots:
    void on_btClose_clicked();

    void on_btAll_clicked();

    void on_btSel_clicked();

    void on_cmbTgz_currentIndexChanged(int index);

private:
    Ui::MArchiver *ui;

    void * _from;
    size_t _size;
    QString _name,_path;
    CMySql * _q;
    bool _is_valid,_is_ext,_allow_select,_list_prepared;
    unsigned int _id,_it_count;
    QList<MCrArItem*> _items;

    void renewQuery();
    void executeQuery();
    void listTgz();
    void extractTgz(bool selected_only,bool overwrite) const;
    void fillList();
signals:
    void tgzExamined();
    void beforeQuery();
};

#endif // MARCHIVER_H
