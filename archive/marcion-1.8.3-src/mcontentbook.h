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

#ifndef MCONTENTBOOK_H
#define MCONTENTBOOK_H

#include <QWidget>

#include "messages.h"
#include "booktextbrowser.h"
#include "htmlreader.h"
#include "mwindowswidget.h"

namespace Ui {
class MContentBook;
}

class MContentBook : public QWidget
{
    Q_OBJECT

public:
    explicit MContentBook(QWidget *parent = 0);
    ~MContentBook();

    //void buildContent(QString const & data);
private slots:
    void on_treeContent_itemDoubleClicked(QTreeWidgetItem *item, int );

    void on_treeContent_customContextMenuRequested(const QPoint &pos);

private:
    Ui::MContentBook *ui;

    void initContent();
    void getItems(QTreeWidgetItem * item);
    //void resolveBranch(QTreeWidgetItem * item,QString const & data);

    QMenu _popup;
    QAction *a_go,*a_expall,*a_colall,*a_exp,*a_col;
};

#endif // MCONTENTBOOK_H
