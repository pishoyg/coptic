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

#ifndef BOOKEDIT_H
#define BOOKEDIT_H

#include <QWidget>

#include "cmysql.h"
#include "messages.h"
#include "settings.h"
#include "ctranslit.h"

namespace Ui {
    class MBookEdit;
}

class MBookEdit : public QWidget
{
    Q_OBJECT

public:

    enum Pos{First,Last,Exact};
    explicit MBookEdit(int cid,QString const & cname,int scr, int lang,short type,short itype,int bid,QString const & bname,QString const & lname,CMessages * const messages,QWidget *parent = 0);
    ~MBookEdit();

    void init();
private:
    Ui::MBookEdit *ui;
    CMessages * const messages;

    int l_id,b_id,c_id,s_id;

    void getChapters(Pos pos,int exact=-1);
    //void getVerses(Pos pos,int exact=-1);

    bool checkChapter0(bool button=true);
    bool checkVerse0(bool button=true);
private slots:
    void on_btZeroC_clicked(bool checked);
    void on_btZeroV_clicked(bool checked);
    void on_spnfPrev_valueChanged(int );
    void on_spnfEdit_valueChanged(int );
    void on_cmbfPrev_currentFontChanged(QFont f);
    void on_cmbfEdit_currentFontChanged(QFont f);
    void on_btDelV_clicked();
    void on_btDelCh_clicked();
    void on_txtEdit_textChanged();
    void on_btAppV_clicked();
    void on_btAppCh_clicked();
    void on_btInsV_clicked();
    void on_btInsCh_clicked();
    void on_spnVerse_valueChanged(int );
    void on_spnChapter_valueChanged(int );
    void on_btUpdateV_clicked();
    void on_btRefreshV_clicked();
    void on_btUpdateC_clicked();
    void on_btRefreshC_clicked();
    void on_btWriteB_clicked();
    void on_btRefreshB_clicked();
    void on_btUpdateL_clicked();
    void on_btRefreshL_clicked();
    void on_cmbUtf1_currentIndexChanged(int index);
    void on_cmbInput_currentIndexChanged(int index);
    void on_btInsUtf_clicked();
    void on_btInsBeta_clicked();
};

#endif // BOOKEDIT_H
