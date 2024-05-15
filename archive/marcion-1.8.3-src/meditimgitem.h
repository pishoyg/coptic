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

#ifndef MEDITIMGITEM_H
#define MEDITIMGITEM_H

#include <QDialog>
#include <QApplication>
#include <QClipboard>

namespace Ui {
    class MEditImgItem;
}

class MEditImgItem : public QDialog
{
    Q_OBJECT

public:
    explicit MEditImgItem(QString const &,QString const &,QList<double> const &,short,short,bool,QWidget *parent = 0);
    ~MEditImgItem();

    QString dir() const,
        file() const,
        colName() const,
        bookName() const,
        coords() const;
    bool isAreaChecked() const;
private slots:
    void on_tbFromClipboard_clicked();
private:
    Ui::MEditImgItem *ui;
};

#endif // MEDITIMGITEM_H
