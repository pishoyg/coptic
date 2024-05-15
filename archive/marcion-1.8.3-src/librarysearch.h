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

#ifndef LIBRARYSEARCH_H
#define LIBRARYSEARCH_H

#include <QMenu>
#include <QProcess>

#include "ctranslit.h"
#include "messages.h"
#include "settings.h"
#include "searchcriteria2.h"
#include "libsearchresult.h"
#include "librarywidget.h"
#include "libsearchbase.h"
#include "mlibsearchtitle.h"
#include "mlibrarybranches.h"
#include "msrwidget.h"

#define SPEC_INDEX_COUNT 2
#define MTIDX_SR 1

namespace Ui {
    class CLibrarySearch;
}

class CLibrarySearch : public QWidget, public CLibSearchBase
{
    Q_OBJECT
    Q_DISABLE_COPY(CLibrarySearch)
public:
            friend class MainWnd;
    explicit CLibrarySearch(CMessages * const messages,
                            CLibraryWidget * const libw,
                            MLibSearchTitle & title,
                            MSRWidget ** sr_tab,
                            QWidget *parent = 0);

            ~CLibrarySearch();
    void searchCoptic(QString const & text);
    QWidget & dialog(){return c_d;}
    void loadArchiveTree();

    void event_Query();
    void event_Refresh();
    void event_stateChanged();
private slots:
    void on_txtSwInput_returnPressed();
    void on_btSwPar_clicked();
    void on_btSwPhrase_clicked();
    void on_btSwQuest_clicked();
    void on_btSwAst_clicked();
    void on_btSwNear_clicked();
    void on_btSwNot_clicked();
    void on_btSwOr_clicked();
    void on_btSwAnd_clicked();
    void on_btAction_clicked(bool checked);
    void on_treeColl_itemChanged(QTreeWidgetItem* item, int column);
    void on_treeColl_customContextMenuRequested(QPoint pos);
    void on_tabColl_currentChanged(int index);
    //void on_btRmNW_clicked();
    void on_inputText_query();
    //void on_cmbLang_currentIndexChanged(int index);
    void on_btEdit_clicked();
    void on_cmbScriptLang_currentIndexChanged(int index);

    void indexChangedSlot(CLibSearchBase::IndexType);
    void settings_fontChanged(CTranslit::Script, QFont);

    void slot_requestTitle(int);

    //void slot_searchInLibrary(QString);
    void on_treeArchive_itemChanged(QTreeWidgetItem* item, int column);

private:
    Ui::CLibrarySearch * ui;
    CMessages * const messages;
    CLibraryWidget * const libw;
    MLibSearchTitle & title;
    MSRWidget ** _srtab;

    void init();
    bool is_initialized;
    QString where_collection(char *,QString &,QString &) const;
    void collectCheckedHtmlLibItems(QList<QTreeWidgetItem*> &,QTreeWidgetItem*);
    QList<QTreeWidgetItem> coll;
    CSearchCriteria2 c_d;

    void query();
    void queryHtml();
    void queryArchive();
    void readBooks(QTreeWidgetItem *);
    void removeBooks(QTreeWidgetItem *);
    void checkAllBooks(QTreeWidgetItem *);
    void checkAllArch(QTreeWidgetItem *);
    void collectArchTargets(MItemBase*,QString &,QString &);
    //QString makeLinks(QString const &) const;
    QTreeWidget * htmlTree();

    MButtonMenu pmenu;
    QAction * a_readbooks,*a_hidebooks;
    bool disable_itch;
};

#endif // LIBRARYSEARCH_H
