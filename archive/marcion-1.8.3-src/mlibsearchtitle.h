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

#ifndef MLIBSEARCHTITLE_H
#define MLIBSEARCHTITLE_H

#include <QWidget>
#include "settings.h"

namespace Ui {
    class MLibSearchTitle;
}

class MLibSearchTitle : public QWidget
{
    Q_OBJECT

public:
    enum Request{Refresh,Query,StateChanged};
    explicit MLibSearchTitle(QWidget *parent = 0);
    ~MLibSearchTitle();

    bool isWord() const,isPhrase() const,acceptSpc() const;
    int page() const,limit() const;

    void setLibIndex(int);
    void setQueryLimit();
private:
    Ui::MLibSearchTitle *ui;
signals:
    void request(int);
    void hide();

private slots:
    void on_rbPhrase_toggled(bool checked);
    void on_rbWord_toggled(bool checked);
    void on_btHide_clicked();
    void on_btQuery_clicked();
    void on_btRefresh_clicked();
    void on_cbLimit_toggled(bool checked);
};

#endif // MLIBSEARCHTITLE_H
