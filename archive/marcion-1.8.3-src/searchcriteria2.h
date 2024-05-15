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

#ifndef SEARCHCRITERIA2_H
#define SEARCHCRITERIA2_H

#include <QDialog>
#include <QListWidgetItem>

#include "ctranslit.h"
#include "latcopt.h"

namespace Ui {
    class CSearchCriteria2;
}

class CSearchCriteria2 : public QDialog
{
    Q_OBJECT
    Q_DISABLE_COPY(CSearchCriteria2)
public:
    enum Match{Word,Phrase};

    CSearchCriteria2(QWidget *parent = 0);
    ~CSearchCriteria2();

    QList<QStringList> & makeList();
    QString makeWhere() const;
    QString makeWhere(Match);
    QString makeRegExp() const;
    void init(CTranslit::Script script,Match match);

    QList<QStringList> criteria;

    CLatCopt * input();
private slots:
    void on_btNot_clicked();
    void on_btClear_clicked();
    void on_btUpd_clicked();
    void on_lstWords_itemActivated(QListWidgetItem* item);
    void on_btIns_clicked();
    void on_buttonBox_accepted();
    void on_buttonBox_rejected();
    void on_btDel_clicked();
    void on_btAdd_clicked();
private:
    Ui::CSearchCriteria2 * ui;
    Match match;
};

#endif // SEARCHCRITERIA2_H
