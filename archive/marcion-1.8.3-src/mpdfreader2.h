#ifndef MPDFREADER2_H
#define MPDFREADER2_H

#include "poppler/qt4/poppler-qt4.h"

#include <QMainWindow>
#include <QScrollBar>
#include <QGraphicsScene>
#include <QTreeWidgetItem>
#include <QSpinBox>

#include "messages.h"
#include "settings.h"
#include "graphicsarea.h"
#include "latcopt.h"
#include "lsj.h"
#include "wordpreview.h"
#include "mwindowswidget.h"
#include "mpdfsbwdg.h"
#include "mcopticnumerals.h"
#include "mhebrdict.h"

namespace Ui {
class MPdfReader2;
}

class MPdfTOCDestItem : public QTreeWidgetItem{
public:
    MPdfTOCDestItem(QDomElement e);
    ~MPdfTOCDestItem(){}

    QString _dest,_dest_name,_ext_name,_open;
    bool _expand;
    //Poppler::LinkDestination _linkdest;
    int _pgnum;
};

class CPdfTextItem1 : public QTreeWidgetItem
{
public:
    CPdfTextItem1();
    ~CPdfTextItem1(){}

    QList<QRectF> _rects;
};

class CPdfTextItem2 : public QTreeWidgetItem
{
public:
    CPdfTextItem2();
    virtual ~CPdfTextItem2();

    QRectF _rect;
};

class MPdfReader2 : public QMainWindow
{
    Q_OBJECT

public:
    enum DpiMode{FitWidth,FitHeight,Percent};
    explicit MPdfReader2(QString const & filename,QString const & show_text=QString(),QWidget *parent = 0);
    ~MPdfReader2();

    static bool extractText(QString const & file_name,QString & text);
private:
    Ui::MPdfReader2 *ui;

    QString filename;

    Poppler::Document * pdfdoc;
    Poppler::Page * ppage;

    QRectF last_search;

    void showPage(int,bool);
    void showPage(Poppler::Page *,bool);

    QList<QGraphicsItem*> _items_on_page,_items_on_page2;
    QGraphicsItem * last_g_item;

    QStringList pdfText;
    QString s_text;
    bool s_case;
    QList<QRectF> _found_rects;
    int _frects_iter;

    bool _stop;
    unsigned int _doc_pages_count;
    double current_dpi;
    DpiMode current_dpi_mode;
    Poppler::Page::Rotation current_rot;

    QActionGroup _agrp,_agrp_dpi;

    MPdfSBWdg _sbwdg;

    QSpinBox _spnPercent;
    QToolButton _fbutt;

    MButtonMenu _bm_menu;
    QMenu _bmrm_menu,_content_menu;
    QAction * _a_goto,*_a_expand,*_a_expand_all,*_a_collapse,*_a_collapse_all;

    CLSJ * _gk;
    CWordPreview * _cop;
    MCopticNumerals * _num;
    MHebrDict * _heb;

    bool searchInPage(Poppler::Page::SearchDirection, QString const & text, bool c_ins);
    void loadPdfText();
    void loadRectsOnPage(QTreeWidgetItem*);
    void showRectsOnPage(QTreeWidgetItem*);
    void loadRectsOnPage(QString const & text,bool cs);
    void searchAll(QString const &,bool);
    void highlightAll(QTreeWidgetItem*);
    void highlightAll();
    void highlightOne(int fixed,int offset);
    void clearItemsOnPage();
    double percentToDpi() const;
    double setCurPercent(int side);
    void setCurRotation(Poppler::Page::Rotation rotation);
    void showRect(QRectF rect);
    double setCurrentDpi(double newdpi);
    void rotatePage(bool right);

    void tocBranch(QDomElement pe, QTreeWidgetItem * p,QList<MPdfTOCDestItem*> & toc_list);
private slots:
    void on_treeSearchRes_currentItemChanged(QTreeWidgetItem* current, QTreeWidgetItem* previous);
    void on_btAll_clicked();
    void on_btStopSearch_clicked();
    void on_btSearchNext_clicked();
    void on_btSearchPrev_clicked();

    void slot_copyText(QRectF,int);
    void slot_showLinks();
    void slot_showFonts();
    void slot_mnuView();
    void slot_mnuRot();
    void slot_mnuDpi();
    void slot_mnuRotTrg(QAction*);
    void slot_mnuDpiTrg(QAction*);
    void slot_percent();
    void slot_dpiplus();
    void slot_dpiminus();
    void slot_rotateleft();
    void slot_rotateright();
    void slot_fbutt(bool);
    void slot_bm_triggered(QAction*);
    void slot_bmrm_triggered(QAction*);

    void on_btLinkGoTo_clicked();
    void on_btLinksHide_clicked();
    void on_treeLinks_itemDoubleClicked(QTreeWidgetItem* item, int column);
    void on_btRefreshZoom_clicked();
    void on_btHideFind_clicked();
    void on_cmbSearch_editTextChanged(const QString & arg1);
    void on_wdgScrInp_textChanged(const QString & text);
    void slot_iwImg_resizeRequested(bool smaller);
    void on_actionGk_Lat_dictionary_triggered();
    void on_actionCoptic_dictionary_triggered();
    void on_actionClose_triggered();
    void on_actionFind_triggered(bool checked);
    void on_wdgSpinIter_valueChanged(int new_value,int );
    void on_actionToolbar_triggered(bool checked);
    void on_btHighlight_clicked(bool checked);
    void on_btSearchTop_clicked();
    void on_btSearchBottom_clicked();
    void on_treeSearchRes_itemDoubleClicked(QTreeWidgetItem *item, int column);
    void on_actionRotate_left_triggered();
    void on_actionRotate_right_triggered();
    void on_btInpMode_clicked(bool checked);
    void on_tbAppearanceHide_clicked();
    void on_actionAppearance_triggered(bool checked);
    void on_actionSave_as_text_triggered();
    void on_actionAdd_bookmark_triggered();
    void on_actionDrop_all_triggered();
    void on_tbBookmarks_clicked(bool checked);
    void on_dwTOC_visibilityChanged(bool visible);
    void on_actionTable_of_contents_triggered(bool checked);
    void on_treeTOC_itemDoubleClicked(QTreeWidgetItem *item, int );
    void on_treeTOC_customContextMenuRequested(const QPoint &);
    void on_treeTOC_itemSelectionChanged();
    void on_actionSearch_results_triggered(bool checked);
    void on_dwSR_visibilityChanged(bool visible);
    void on_action_numeric_converter_triggered();
    void on_action_Hebrew_dictionary_triggered();
};

#endif // MPDFREADER2_H
