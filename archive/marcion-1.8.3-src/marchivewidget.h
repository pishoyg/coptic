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

#ifndef MARCHIVEWIDGET_H
#define MARCHIVEWIDGET_H

#define MTIDX_ARCH 0

#include <QWidget>

#include "librarywidget.h"
#include "marchiveitem.h"
#include "mlibrarybranches.h"
#include "mchoosecategory.h"
#include "mbzip.h"
#include "msetarchivedata.h"
#include "filechooser.h"

namespace Ui {
class MArchiveWidget;
}

class MArchiveWidget : public QWidget
{
    Q_OBJECT

public:
    enum ArchiveFilterType{Work,Author,FileName,TgzName,Id};
    explicit MArchiveWidget(CLibraryWidget * lib_widget,QTabWidget ** const main_tab,QWidget *parent = 0);
    ~MArchiveWidget();

    void readCategories(bool after_drop=false,int select_id=-1);
    static void loadArchiveLibrary(MLibBranchItem*,QTreeWidget*,bool,QString const &,bool,int selected=-1);
    void openArchiveBooks();
    void manageArchive();
private:
    Ui::MArchiveWidget *ui;

    CLibraryWidget * const _libraryW;
    QTabWidget ** const _mainTab;

    MLibraryBranches * _lbranch;
    MLibBranchItem *lbAll,*lbUnc;

    MButtonMenu popupCat,popupStruct;

    QAction *a_str_add,*a_str_del,*a_str_edit,*a_str_open,*a_chngcat,*a_str_refcat,*a_str_mancat,*a_str_store,*a_str_restore,*a_str_crindex,*a_str_dropdata,*a_str_dropindex,*a_str_chngauth,*a_hdr_lock,*a_hdr_free;
    QActionGroup _agrp;

    QAction *a_cat_refresh,*a_cat_refcat,*a_cat_manage,*a_cat_add;

    void chngArchAuthor();
    void changeArchiveCategory();
    void setArchiveFilter(QString const & filter);
    void addArchiveItem(MLibBranchItem * item),
        removeArchiveItem(MLibBranchItem * item),
        editArchiveItem(QTreeWidgetItem*);
    static MArchiveWidget::ArchiveFilterType parseArchiveFilter(QString & filter);
    void storeArchData(MArchiveLibItem *);
    void restoreArchData(MArchiveLibItem *);
    void dropArchData();
    bool dropMIndex(MArchiveLibItem * item);
    static void checkMIndex(MArchiveLibItem*);
    void createMIndex(MArchiveLibItem*);

private slots:
    void slot_categoriesChanged();
    void on_treeArchive_customContextMenuRequested(QPoint pos);
    void on_treeStruct_itemDoubleClicked(QTreeWidgetItem *,int);
    void on_treeStruct_customContextMenuRequested(const QPoint &pos);
    void on_treeArchive_itemDoubleClicked(QTreeWidgetItem* item, int column);
    void on_btRegExpArch_clicked();
    void on_btFilter_toggled(bool checked);
    void on_cmbFilterArch_currentIndexChanged(QString );
    void slot_closeManager();
    void on_tbAction_toggled(bool checked);
    void on_tbActionArch_toggled(bool checked);
    void on_treeStruct_itemSelectionChanged();
signals:
    void indexChanged(CLibSearchBase::IndexType);
    void tgzsChanged();
    void catsChanged();
    void authsChanged();
};

#endif // MARCHIVEWIDGET_H
