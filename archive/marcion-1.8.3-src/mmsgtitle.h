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

#ifndef MMSGTITLE_H
#define MMSGTITLE_H

#include <QWidget>
#include "settings.h"

namespace Ui {
    class MMsgTitle;
}

class MMsgTitle : public QWidget
{
    Q_OBJECT

public:
    enum Request{Hide,Top,Bottom,Clear,Help,Version};
    explicit MMsgTitle(QWidget *parent = 0);
    ~MMsgTitle();

private:
    Ui::MMsgTitle *ui;
signals:
    void request(int);

private slots:
    void on_btClear_clicked();
    void on_btHide_clicked();
    void on_btBottom_clicked();
    void on_btTop_clicked();
    void on_btHelp_clicked();
    void on_btVersion_clicked();
};

#endif // MMSGTITLE_H
