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

#ifndef LIBRARYWIDGET_H
#define LIBRARYWIDGET_H

#include "messages.h"
#include "settings.h"
#include "cmysql.h"
#include "mversedbook.h"
#include "progressdialog.h"
#include "bookreader.h"
#include "htmlindexdialog.h"
#include "htmlreader.h"
#include "mdownloadweb.h"
#ifndef NO_POPPLER
    #include "mpdfreader2.h"
#endif
#include "mdjvureader2.h"
#include "translbook.h"
#include "mimagebookreader.h"
#include "bookedit.h"
#include "libbase.h"
#include "mindexdir2.h"
#include "regexpbuilder.h"
#include "mfsclip.h"
#include "mlibtreewidget.h"
#include "mlibtitle.h"
#include "mprogressicon.h"
#include "mrenamedialog.h"
#include "mnotepad.h"

#include "IbycusAuthTab.h"
#include "IbycusIdt.h"
#include "IbycusTxtFile.h"
#include "IbycusException.h"

#include <QMenu>
#include <QProcess>
#include <QFileDialog>
#include <QMessageBox>
#include <QProgressBar>
#include <QTextCodec>

/*class CBranch : public QTreeWidgetItem
{
public:
    CBranch():QTreeWidgetItem(0),id(0),lang_id(-1),branch_id(-1){}
    int id;
    int lang_id;
    int branch_id;
};*/

class CMIndexItem
{
public:
    CMIndexItem(QString const & word,CTranslit::Script script);
    CMIndexItem();
    CMIndexItem(CMIndexItem const & other);

    CMIndexItem const & operator=(CMIndexItem const & other);
    ~CMIndexItem(){}

    bool operator==(CMIndexItem const &) const;

    QString _word;
    CTranslit::Script _script;
    unsigned int _count;
};

class CLibItem : public QTreeWidgetItem
{
public:
    enum Type{Script,Lang,Col1,Col2,Book1,Book2,LBranch,BBranch};
    CLibItem(int id,int lang_id,int branch_id,Type type,short index_type=-1,short format=-1):
            QTreeWidgetItem(QTreeWidgetItem::UserType),id(id),lang_id(lang_id),branch_id(branch_id),
            type(type),
            index_type(index_type),
            format(format){}
    void setType(Type type){CLibItem::type=type;}
    int id;
    int lang_id;
    int branch_id;
    Type type;
    short index_type;
    short format;

    CLibItem const * parent() const{return (CLibItem const*)QTreeWidgetItem::parent();}
};

/*class CTlgItem : public QTreeWidgetItem{
public:
    CTlgItem();
};*/

namespace Ui {
    class CLibraryWidget;
}

class MainWnd;

class CLibraryWidget : public QWidget, public CLibBase {
    Q_OBJECT
    Q_DISABLE_COPY(CLibraryWidget)
public:
            //friend class MainWnd;
            //friend class MArchiveWidget;
    enum DocFmt{Html,Txt,Djvu,Pdf,IltHtml,Auto,Image};
    explicit CLibraryWidget(CMessages * const messages,MLibTitle & libtitle,
                            QWidget *parent = 0);
    ~CLibraryWidget();

    void activateLibType(int lib_type);
    void reloadTree(MProgressIcon * p_icon=0);
    bool load_tree(MProgressIcon * p_icon=0);
    bool isLoaded() const{return is_loaded;}
    void dropEntireLibrary();
    bool isSearchable(int) const;
    bool isSearchableByRegexp(int) const;
    CLibItem const * collectionById(unsigned int id) const;
    static bool loadHtmlLibrary(CMessages *,QTreeWidget*,bool,MProgressIcon * p_icon=0);
    bool loadHtmlLibraryToWidget(MProgressIcon * p_icon=0);
    QTreeWidget * htmlTree();
    static QWidget * openHtmlBook(CMessages *,QString const &,DocFmt,QString const & show_text=QString(),QString const & wtitle=QString(),QIcon const & w_icon=QIcon());
    //static void openArchiveBook(QString const &);
    bool findHtmlItem(QDir const &);
    void findHtmlFile(QTreeWidgetItem*,QTreeWidget*,QRegExp const &);
    void activate();
    void openMysqlBook(int,int,int,int);
    void getSimulBooks(QTreeWidget * tree) const;
    void loadTlgCorp();
    void openTlgBook(QTreeWidgetItem *);
private:
    Ui::CLibraryWidget *ui;
    CMessages * const messages;
    bool is_loaded;
    MButtonMenu popup,popupHtml,popupTLG;
    QMenu popupFind,popupDrag,/*popupEncoding,*/popupOpenAs;

    QAction *open_book,*expand,*collapse,*expand_all,*collapse_all,*reload_tree,*bkp_book,*del_book,*show_index,*chk_index,*chk_index_all,*cr_index,*drop_index,*drop_all,*drop_library;

    QAction *open_book_h,*expand_h,*collapse_h,*expand_all_h,*collapse_all_h,*show_index_h,*cr_index_h,*drop_index_h,*downloadweb_h,*reload_tree_h,*a_show_hidden,*create_dir_h,*rename_h,*rm_dir_h,*find_file,* a_cutfd,* a_copyfd, * a_pastefd,*a_printfd;

    QAction *a_crnewb,*a_crnewc,*a_edb,*a_rmbook,*a_newlang,*a_rmlang;
    QAction * a_ashtml,* a_astxt,* a_aspdf,* a_asdjvu,* a_astr,* a_asimg,*a_edittxt;

    QAction *tlg_open_book,*tlg_expand,*tlg_collapse,*tlg_expand_all,*tlg_collapse_all,*tlg_reload;

    QAction *a_open2,*a_clear2;

    QAction *a_dd_copy,*a_dd_cut;

    QList<QTreeWidgetItem*> coll1_items;

    bool op_OK;

    QString cut_s,copy_s;

    static QString diritem;
    static QTreeWidgetItem * dir_t_item;

    static int newBid,newCid,newLid;
    static bool _hidden_files;

    MLibTitle & _libtitle;

    QList<QPair<QTreeWidgetItem*,QTreeWidgetItem*> > f_files;
    QList<QTreeWidgetItem*> drag_items;
    MFSClip _clipboard;

    RtfTextDelegate rtfd;

    /*QList<QPair<ibystring_t,ibystring_t> > corpora;
    QList<int> corpora_id;
    QList<QPair<ibystring_t,ibystring_t> > author;*/

    void backupBook() const;
    void deleteCollection();
    void openBooks();
    bool checkIndex(bool all=false,MProgressIcon * p_icon=0) const;
    void showIndexState();
    void dropIndex();
    void dropHtmlIndex();
    void createIndexes();
    void dropAll();
    bool createIndex(CLibItem const * const item);
    void createHtmlIndex();
    //void createHtmlIndex(QString const &,bool);
    void delHtmlDir(QList<QTreeWidgetItem*> * items);
    //void rmDir(QDir const &);
    void findFileDialogSwitch();
    void openHtmlBooks();
    void mkDir(),renameDF(QTreeWidgetItem * item);
    QString collectNames(QList<QTreeWidgetItem*> * items,QString const & target);
    void cutHtml(QList<QTreeWidgetItem*> * items),
        copyHtml(QList<QTreeWidgetItem*> * items),
        pasteHtml(QTreeWidgetItem * item);
    void downloadWeb();
    void createNewCol(CLibItem const*);
    void createNewBook(CLibItem const*);
    void createNewLang(CLibItem const*);
    void editBook(CLibItem const*);
    void removeBook(CLibItem const*);
    void removeLang(CLibItem const*);
    //void makeRelative(QString &) const;
    void readTlgAuthors(),readTlgWorks();

    static void clearHtmlItem(),
        setHtmlItem(QString const &),
        //cdupHtmlItem(),
        //setHtmlItem(QTreeWidgetItem *),
        selectHtmlItem(QTreeWidget * tree,bool);
    static bool cdupHtmlItem();
    QString convertLine(QString const & line,unsigned short,unsigned short) const;

    static int readDirs(QTreeWidget*,QDir const &,QTreeWidgetItem *,bool,MProgressIcon * p_icon=0);
    static void validateHtmlItem(MFileInfoItem const * fip,MLibTreeWidgetItem * i,bool chkb_ind);

    QMenu * createEncMenu();

    void cloneSimulChilds(CLibItem * item,CSimulTreeItem * sitem) const;
protected:
    void keyPressEvent(QKeyEvent * event);
private slots:
    void slot_menu();
    void on_treeHtmlLib_customContextMenuRequested(QPoint pos);
    void on_treeHtmlLib_itemDoubleClicked(QTreeWidgetItem* item, int column);
    void on_treeLibrary_itemDoubleClicked(QTreeWidgetItem* item, int column);
    void on_treeLibrary_customContextMenuRequested(QPoint pos);
    void on_treeTLG_customContextMenuRequested(QPoint pos);
    void on_treeTLG_itemDoubleClicked(QTreeWidgetItem* item, int column);
    void on_btHide_clicked();
    void on_btSearch_clicked();
    void on_btRegExp_clicked();
    void on_cmbFindFile_activated(QString );
    void on_treeFiles_itemDoubleClicked(QTreeWidgetItem* item, int column);
    void on_treeFiles_customContextMenuRequested(QPoint pos);
    void on_treeHtmlLib_drag();
    void on_treeHtmlLib_drop(QTreeWidgetItem * item);
    void on_treeFiles_currentItemChanged(QTreeWidgetItem *current, QTreeWidgetItem *previous);
    void on_btFindFileCh_clicked();

    void slot_decodeFileName();

signals:
    void indexChanged(CLibSearchBase::IndexType);
};

#endif // LIBRARYWIDGET_H
