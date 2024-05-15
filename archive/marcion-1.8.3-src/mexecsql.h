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

#ifndef MEXECSQL_H
#define MEXECSQL_H

#include <QWidget>
#include <QMenu>
#include <QAction>

#include "cmysql.h"
#include "messages.h"
#include "settings.h"

namespace Ui {
    class MExecSql;
}

class MTblItem : public QTreeWidgetItem
{
public:
    MTblItem();
    ~MTblItem(){}

    void setText();

    QString _tbl,_msg,_records;
    //unsigned int _records;
};

class MExecSql : public QWidget
{
    Q_OBJECT

public:
    explicit MExecSql(CMessages * const messages,
                      QWidget *parent = 0);
    ~MExecSql();

private:
    Ui::MExecSql *ui;

    CMessages * const messages;
    MButtonMenu popup;
    QAction *a_refresh,*a_check,*a_check_all,*a_export,*a_trunc,*a_drop,*a_repair;

    void readTables(bool check);
    void checkTable(MTblItem *);
    void repairTable(MTblItem *);
    void truncateTable(MTblItem *);
    void dropTable(MTblItem *);
    void exportTable(MTblItem *);

private slots:
    void on_btClearSql_clicked();
    void on_btClear_clicked();
    void on_btClose_clicked();
    void on_btExecute_clicked();

    void on_histHist_buttonClicked(int);
    void on_btAction_clicked(bool checked);
    void on_treeTables_customContextMenuRequested(QPoint pos);
};

#endif // MEXECSQL_H
