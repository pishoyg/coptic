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

#ifndef MLIBRARYBRANCHES_H
#define MLIBRARYBRANCHES_H

#include <QWidget>
#include <QListWidgetItem>
#include <QMenu>
#include <QAction>

#include <archive.h>
#include <archive_entry.h>

#include "cmysql.h"
#include "messages.h"
#include "settings.h"
#include "mcreatearchive.h"
#include "marchiver.h"
#include "mremaptgz.h"

class MItemBase : public QTreeWidgetItem
{
public:
    MItemBase();
    ~MItemBase(){}
    virtual bool isCategory() const=0;
};

class MArchiveLibItem :  public MItemBase
{
public:
    enum DataType{NoData=0,OneFile=1,Tarball=2};
    MArchiveLibItem();
    /*MArchiveLibItem(QString const & work,
                 QString const & author,
                 unsigned int id,
                 unsigned int author_id,
                 unsigned int category,
                 QString const & target);*/
    ~MArchiveLibItem(){}

    void setText();
    bool isCategory() const {return false;}

    QString iddataAsStr() const,
        idAsStr() const,
        idauthAsStr() const,
        idcatAsStr() const;

    unsigned int _id,_author,_category,_data;
    QString _workT,_authorT,_target,_tgz_title;
    bool _category_is_null,_author_is_null,_data_is_null;
    long _index_count,_index_count_diff,_data_size,_ind_lat,_ind_gk,_ind_heb,_ind_cop;
    DataType _data_type;
};

class MAuthorItem : public QTreeWidgetItem
{
public:
    MAuthorItem(QString const & text,unsigned int id);
    ~MAuthorItem(){}

    void setText();

    unsigned int _id;
    unsigned int _used;
    QString _text;
};

class MTgzItem : public QTreeWidgetItem
{
public:
    MTgzItem(QString const & title,QString const & path,unsigned int bytes,unsigned int id);
    ~MTgzItem(){}

    void setText();

    unsigned int _id,_used,_bytes;
    QString _title,_path;
};

class MLibBranchItem : public MItemBase
{
public:
    enum Status{New,Deleted,Modified,Unchanged};
    enum Type{Standard,All,Uncategorized};
    MLibBranchItem(int,Status,bool);
    MLibBranchItem(MLibBranchItem const &);
    ~MLibBranchItem(){}
    void setText(bool search=false);
    MLibBranchItem * parent() const;
    bool isCategory() const {return true;}
    //void operator=(MLibBranchItem const &);
    unsigned int _id,_branch;
    QString _name;
    Status _status;
    Type _type;
    unsigned int _arch_items;
    bool _isTop;
};

namespace Ui {
    class MLibraryBranches;
}

class MLibraryBranches : public QWidget
{
    Q_OBJECT

public:
    explicit MLibraryBranches(QWidget *parent = 0);
    ~MLibraryBranches();

    static void readBranches(QTreeWidget*,bool search=false,int select_id=-1);
    static MLibBranchItem * findId(QTreeWidget*,unsigned int);
private slots:
    void on_btClose_clicked();
    void on_btExec_clicked();
    void on_btDel_clicked();
    void on_btAdd_clicked();
    void on_btRefresh_clicked();
    void on_btUpdate_clicked();
    void on_txtName_returnPressed();
    void on_btAdd_2_clicked();
    void on_treeCat_currentItemChanged(QTreeWidgetItem* current, QTreeWidgetItem* previous);
    void on_treeCat_customContextMenuRequested(QPoint pos);
    void on_btUpdate_2_clicked();
    void on_btRefresh_2_clicked();
    void on_btDel_2_clicked();
    void on_btAdd_3_clicked();
    void on_txtAuthor_returnPressed();
    void on_treeAuthors_currentItemChanged(QTreeWidgetItem* current, QTreeWidgetItem* previous);
    void on_btAddTGZ_clicked();
    void on_btDelTGZ_clicked();
    void on_treeTGZ_customContextMenuRequested(QPoint pos);
    void on_btCrTgz_clicked();
    void on_treeTGZ_currentItemChanged(QTreeWidgetItem* current, QTreeWidgetItem* );
    void on_btUpdTitle_clicked();
    void on_btRefreshTgz_clicked();

//public slots:
    void slot_reloadTgzs();
    void slot_reloadCats();
    void slot_reloadAuths();
    void slot_tgz_remapped(unsigned int id);

    void on_txtTgzTitle_returnPressed();

private:
    Ui::MLibraryBranches *ui;

    QMenu popup,popupTgz;
    QAction *a_addnew,*a_del,*a_addcurr,*a_read,*a_write;
    QAction *a_tgz_new,*a_tgz_cr,*a_tgz_del,*a_tgz_examine,*a_tgz_ref,*a_tgz_remap;

    void writeBranches();
    void makeItemText(MLibBranchItem &) const;
    static MLibBranchItem * findId(MLibBranchItem *, unsigned int);
    void writeItem(MLibBranchItem *,bool init=false) const;

    void readAuthors(),readTgzs();

    void removeTgzItem(MTgzItem*);
    void newTgzItem();
    void createTarball(MTgzItem*);
    void remapTgz(MTgzItem*);
    void examineTgz(MTgzItem *) const;
signals:
    void categoriesChanged();
    void closeManager();
};

#endif // MLIBRARYBRANCHES_H
