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

#ifndef MARCHIVEITEM_H
#define MARCHIVEITEM_H

#include <QDialog>
#include <QDir>

#include "cmysql.h"
#include "messages.h"

namespace Ui {
    class MArchiveItem;
}

class MArchiveItem : public QDialog
{
    Q_OBJECT

public:
    explicit MArchiveItem(QString const &,
                          QString const &,
                          QString const &,
                          QString const &,
                          bool allow_chng_file,
                          QWidget *parent = 0);
    explicit MArchiveItem(QWidget *parent = 0);

    ~MArchiveItem();

    QString newWork() const,
        newTarget() const,
        newAuthor() const,
        newAuthorName() const;

    bool isAuthorChanged() const;

private slots:
    void on_btFromCurrent_clicked();

private:
    Ui::MArchiveItem *ui;
    QString _target,alt_target;
    bool _alt;
    int _auth_index;

    void readAuthors(unsigned int,bool);
    void testTarget();
};

#endif // MARCHIVEITEM_H
