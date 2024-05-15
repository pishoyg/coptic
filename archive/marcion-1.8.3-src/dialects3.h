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

#ifndef DIALECTS3_H
#define DIALECTS3_H
//
#include <QWidget>
#include <QCheckBox>

#include "latcopt.h"

namespace Ui {
class frmDialectsWidget;
}

class CDialects3 : public QWidget
{
Q_OBJECT
public:
	enum State {
		Accepted,Rejected
	};
	enum Dialect{
		Sah=1,
		SahA=2,
		SahF=4,
		Achm=8,
		AchmSub=16,
		Boh=32,
		Fay=64,
		FayB=128,
        Old=256,
        NagHamm=512
	};

    explicit CDialects3( QWidget * parent = 0);
    ~CDialects3();

	QString makeRecord() const;
    QString engText() const,greekText() const;

    void setCoptic();

	QString const & errText() const;
	bool isValid() const;
	bool isActive() const;
	void setText(QString const &,
        QString const &,QString const &);
        void setFont(QFont const & Font);
private slots:
        void on_btExt_clicked();
        void on_btCaus_clicked();
        void on_btGk_clicked();
        void on_btNounF_clicked();
        void on_btNounM_clicked();
        void on_btNoun_clicked();
        void on_btUnc_clicked();
 void on_btUnk_clicked();
 void on_btQual_clicked();
 void on_btIntr_clicked();
 void on_btTr_clicked();
 void on_lstChooser_currentRowChanged(int currentRow);
	void on_btUpdate_clicked();
	void on_btIns_clicked();
	void on_btAdd_clicked();
	void on_btDel_clicked();
private:
    Ui::frmDialectsWidget *ui;

	void prepRow(int);
	void finish(State);
	void parseText(QString const &);
	bool _err;
	QString _errtext;
	State result;
        QFont font;
signals:
	void finished(int);
};
#endif
