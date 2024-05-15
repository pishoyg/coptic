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

#ifndef REORDER_H
#define REORDER_H
//
#include <QDialog>
#include "messages.h"
#include "ctranslit.h"
//

namespace Ui {
    class dlgReorder;
}

class CReorder : public QDialog
{
Q_OBJECT
public:
	CReorder( QString title, int RowCount,
	QString const & word,
    QWidget * parent = 0);
    ~CReorder();

	void appendItem(QString word,
		QString key,
		QString pos);
		bool deleteAll() const;
        void setFont(QFont const & f);
		QStringList Delete,Reorder;
private slots:
	void on_btDown_clicked();
	void on_btUp_clicked();
	void on_btDelWord_clicked();
	void on_btDel_clicked();
	void on_btOk_clicked();
	void on_btStorno_clicked();
private:
    Ui::dlgReorder *ui;

	bool delete_all;
	int iter;
};
#endif
