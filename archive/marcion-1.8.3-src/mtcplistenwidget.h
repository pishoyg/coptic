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

#ifndef MTCPLISTENWIDGET_H
#define MTCPLISTENWIDGET_H

#include <QWidget>
#include <QButtonGroup>

#include "settings.h"

namespace Ui {
    class MTcpListenWidget;
}

class MTcpListenWidget : public QWidget
{
    Q_OBJECT

public:
    explicit MTcpListenWidget(QWidget *parent = 0);
    ~MTcpListenWidget();

    void checkServer();
private slots:
    void on_btStart_clicked();

    void on_btStop_clicked();

private:
    Ui::MTcpListenWidget *ui;
    QButtonGroup _bgroup;
};

#endif // MTCPLISTENWIDGET_H
