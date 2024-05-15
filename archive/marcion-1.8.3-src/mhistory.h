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

#ifndef MHISTORY_H
#define MHISTORY_H

#include <QWidget>

namespace Ui {
    class MHistory;
}

class MHistory : public QWidget
{
    Q_OBJECT

public:
    explicit MHistory(QWidget *parent = 0);
    ~MHistory();

    int currentIndex() const;
    QString text(int) const;
    void append(QString const &);
private slots:
    void on_btFirst_clicked();

    void on_btPrev_clicked();

    void on_btNext_clicked();

    void on_btLast_clicked();

    void on_btRefresh_clicked();

private:
    Ui::MHistory *ui;
    QStringList history;
    int ci;

    void enableButtons();
signals:
    void currentIndexChanged(int);
    void buttonClicked(int);
};

#endif // MHISTORY_H
