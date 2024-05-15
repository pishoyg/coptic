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

#ifndef COPINTTR_H
#define COPINTTR_H

#include <QWidget>
#include <QMenu>
#include <QAction>
#include <QFont>

#include "ctranslit.h"
#include "messages.h"
#include "settings.h"
#include "cmysql.h"

namespace Ui {
    class CCopIntTr;
}

class CCopIntTr : public QWidget {
    Q_OBJECT
public:
    CCopIntTr(CMessages * const messages,QWidget *parent = 0);
    ~CCopIntTr();

protected:
    void changeEvent(QEvent *e);

private:
    Ui::CCopIntTr *ui;

    enum {All,Word,Words,Equivs};

    CMessages * const messages;
    QMenu popup,popup_grp;
    QAction * a_delete,* a_grp_imp_cont,* a_grp_delete,* a_grp_entire,*a_grp_delw,*a_grp_dele,*a_grp_del;

    QString last_wid,last_eqid,last_grid,last_crumid;
    QFont cop_font,lat_font;

    void execQuery(QString const & where);
    void execQuery2(QString const & where);
    void execQuery3(QString const & where);
    void deleteItem(),deleteGrpItem(int);
    void clearTrees();
    void importData();
    void entireGroup();

    bool checkDupId(short tbl,int id,int oldkey) const;
private slots:
    void on_btGk_clicked();
    void on_btCnvTxt_clicked();
    void on_rbCz_clicked(bool checked);
    void on_rbEn_clicked(bool checked);
    void on_rbCop_clicked(bool checked);
    void on_btD_clicked();
    void on_btW_clicked();
    void on_btPar_clicked();
    void on_btClean_clicked();
    void on_btUpdateDb_clicked();
    void on_btCancelUpdDb_clicked();
    void on_treeGroup_customContextMenuRequested(QPoint pos);
    void on_cbUpdGrp_clicked(bool checked);
    void on_btUpdGrp_clicked();
    void on_btNewGrp_clicked();
    void on_cbCz_clicked(bool checked);
    void on_treeGroup_itemSelectionChanged();
    void on_treeOut_customContextMenuRequested(QPoint pos);
    void on_btUpdEqv_clicked();
    void on_btShowAll_clicked();
    void on_cbEngUpd_clicked(bool checked);
    void on_cbCzechUpd_clicked(bool checked);
    void on_btNewEqv_clicked();
    void on_cbUpdCrumId_clicked(bool checked);
    void on_cbUpdWord_clicked(bool checked);
    void on_btUpdWord_clicked();
    void on_treeOut_itemSelectionChanged();
    void on_btNew_clicked();
    void on_btQuery_clicked();
    void on_rbCz_toggled(bool checked);
    void on_rbEn_toggled(bool checked);
    void on_rbCop_toggled(bool checked);
    void settings_fontChanged(CTranslit::Script, QFont) ;
    void on_trWord_query();
};

#endif // COPINTTR_H
