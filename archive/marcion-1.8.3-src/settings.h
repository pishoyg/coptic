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

#ifndef SETTINGS_H
#define SETTINGS_H
//

#include "messages.h"
#include "ctranslit.h"
#include "outstr.h"
#include "tbldesigner.h"
#include "mbuildconfig.h"
#include "mtcpserver.h"
#include "libbase.h"
#include "mwindowswidget.h"
#include "msrwidget.h"

#include <QWidget>
#include <QCheckBox>
#include <QGroupBox>
#include <QTabWidget>
#include <QFileDialog>
#include <QTextStream>
#include <QFile>
#include <QDesktopServices>
#include <QProcess>
#include <QImageReader>
#include <QMenu>
#include <QAction>
#include <QDateTime>
#include <QStyledItemDelegate>
#include <QPainter>
#include <QDesktopWidget>
#include <QAbstractButton>
#include <QTabWidget>
#include <QUrl>

#define SET_WAIT_CURSOR QApplication::setOverrideCursor(Qt::WaitCursor);

#define SET_BUSY_CURSOR QApplication::setOverrideCursor(Qt::BusyCursor);

#define REST_CURSOR QApplication::restoreOverrideCursor();

#define TT_BUTTONS if(m_sett()){m_sett()->updButtonToolTips(*this);} adjustSize();
#define IC_SIZES if(m_sett()){m_sett()->setIcSizes(*this); m_sett()->updButtonToolTips(*this);} adjustSize();
#define ICTB_SIZES if(m_sett()){m_sett()->setIcSizes(*this); m_sett()->updButtonToolTips(*this); setIconSize(m_sett()->iconsSize(true));} adjustSize();
#define IC_SIZES_WIDGET(WIDGET) if(m_sett()){m_sett()->setIcSizes(*WIDGET); m_sett()->updButtonToolTips(*WIDGET);}

#define USE_CLEAN MClean _clean_;
#define SET_WAIT _clean_.setWaitCursor();
#define SET_BUSY _clean_.setBusyCursor();

#define USE_CLEAN_BUSY USE_CLEAN SET_BUSY
#define USE_CLEAN_WAIT USE_CLEAN SET_WAIT

//

class MButtonMenu : public QMenu
{
    Q_OBJECT
public:
    MButtonMenu(QString const & title=QString());
    ~MButtonMenu(){}

    void setButton(QAbstractButton * button);
    QAction * exec();
    static QPoint movePopupMenu(QWidget * widget,QMenu * menu);
private slots:
    void slot_aboutToHide();
private:
    QAbstractButton * _button;
};

class RtfTextDelegate : public QStyledItemDelegate
{
    friend class MCmbBoxResult;
public:
    RtfTextDelegate(int indent,bool coptic,QObject * parent = 0);
    ~RtfTextDelegate(){}

    void setRExp(QRegExp const & expression);
    void setCaretMode(QRegExp::CaretMode caret_mode);
protected:
    void paint(QPainter * painter,const QStyleOptionViewItem & option,const QModelIndex & index) const;
    void drawText(QPainter * painter,QString const & text,QRectF const & rect,QColor spec_color,int flags) const;
private:
    QRegExp exp;
    int const indent;
    QRegExp::CaretMode cmode;
    bool const _coptic;
};

bool & preventClose();

class MClean
{
public:
    MClean();
    //MClean(QFile * const file);
    ~MClean();
    void setWaitCursor();
    void setBusyCursor();
private:
    bool _cursor;
    //QFile * const _file;
};

class MFileItem
{
public:
    enum Type{MySql=1,Html=2};
    MFileItem(QString const & filename);
    MFileItem(QString const & text,unsigned int book,unsigned int chapter,unsigned int verse,unsigned int script);
    MFileItem(MFileItem const & other);

    MFileItem & operator=(MFileItem const & other);
    bool operator==(MFileItem const & other);

    ~MFileItem(){}

    Type _type;
    QString _filename;
    unsigned int _book,_chapter,_verse,_script;
};

class MListFileItem : protected QList<MFileItem>
{
public:
    MListFileItem();
    ~MListFileItem();

    using QList<MFileItem>::clear;
    using QList<MFileItem>::count;
    using QList<MFileItem>::at;

    void prependFileItem(MFileItem const & item,bool append=false);
    QMenu * popupMenu(){return rec_menu;}

    void buildMenu(const QObject * receiver,
                   const char * member,
                   const char * member_clear);
    void initMenu(),deleteMenu();
private:
    QMenu * rec_menu;
};

namespace Ui {
class frmSettings;
}

class CSettings : public QWidget
{
Q_OBJECT
public:
        CSettings(CMessages * messages,
                  QTabWidget ** main_tab,
                  MSRWidget ** sr_tab,
                  MWindowsWidget * windows_widget,
                  QWidget * parent = 0);
        ~CSettings();

        enum Change
        {
            AppFont,
            EditMode,
            ClipScan
        };
        enum Lang
        {
            English=0,
            Czech=1
            /*Greek=2,
            German=3*/
        };

        bool tipAtStartup() const;

        bool scan() const;
        bool scanGk() const;
        bool scanLat() const;
        bool scanCop() const;

        bool trayIsChecked() const;

        QGroupBox * sc();
        QCheckBox *scCop(),*scLat(),*scGk(),*tray();

        QString dir1() const,dir2() const,dir3() const;

        bool extraAppFont() const;
        QFont appFont() const;
        int appFontSize() const;
        QFont copticFont() const;
        int copticFontSize() const;
        QFont greekFont() const;
        int greekFontSize() const;
        QFont latinFont() const;
        int latinFontSize() const;
        QFont hebrewFont() const;
        int hebrewFontSize() const;

        QFont tlgGreekFont() const;
        int tlgGreekFontSize() const;
        QFont tlgCopticFont() const;
        int tlgCopticFontSize() const;
        QFont tlgHebrewFont() const;
        int tlgHebrewFontSize() const;

        QFont font(CTranslit::Script) const;
        int fontSize(CTranslit::Script) const;
        QFont bFont(CTranslit::Script) const;

        QString spanStringFont(QString const & text,CTranslit::Script script,int size_offset=0);

        /*QString user() const {return txtUser->text();}
        QString pwd() const {return txtPwd->text();}
        QString host() const {return txtHost->text();}
        QString db() const {return txtDb->text();}
        unsigned int port() const {return txtPort->text().toInt();}*/

        QString border() const;
        QString padding() const;
        QString spacing() const;

        QString nick() const;

        QString HTfgColor() const;
        QString HTbgColor() const;
        QColor HTfgC() const;
        QColor HTbgC() const;

        QColor HTCDNorm(),HTCDSel() const;

        QString bookTblTemplate() const;
        QString bookRowTemplate() const;
        QString libsearchresTblTemplate() const;

        QString background() const;
        QString defaultBrowser() const;
        bool isLangEnglish() const;

        bool loadAppFonts();
        static bool readAppFont(QTranslator*,int&,QFont &,bool & splash_simple,bool &);
        bool isCopticEditable() const;
        bool isTlgEnabled() const;

        void loadBackground();

        QString wgetCmd() const;
        QString swishCmd() const;

        int imgSelBorderWidth() const;
        int imgSelFillOpacity() const;
        QColor imgSelBorderColor() const;
        QColor imgSelFillColor() const;

        bool copDictToolTips() const;
        bool copDictAutoHL() const;
        bool checkMysqlIndexes() const;

        QSize iconsSize(bool) const;
        void setIcSizes(QWidget const &,int size=0) const;
        void updButtonToolTips(QWidget const & widget) const;

        void execBrowser(QUrl const &);

        QString imageFormatsFilters() const{return iffilters;}
        QRegExp imageFormatsRegExp() const{return QRegExp(ifcmp,Qt::CaseInsensitive);}
        QList<QByteArray> const & imageFormats() const{return ifmts;}
        //bool parseNote(QString & text,QString & note);
        QString noteStyle() const;

        static QIcon iconForFilename(QString const & filename);

        QString tmpDir() const;

        bool unicodeInput() const;
        int queryResultsCount() const;
        bool showEntireBook() const;
        bool showHyperlinksToConcordance() const;

        QTabWidget * mainTab(){return *_mtab;}
        MWindowsWidget * wnds(){return _wnds;}

        static QString marcDir;
        static MBuildConfig * wiz;
        static QStringList openFiles;
        static MListFileItem recentFiles;
        static MTcpServer * tcpServer;
        static QDateTime app_start_time;
        static bool _ro_mode;
private slots:
        void on_btDefBr_clicked();
        void on_btDefaults_clicked();
        void on_btUseIcSizeT_clicked();
        void on_btUseIcSize_clicked();
        void on_btBrowser_clicked();
        void on_btChooseSwish_clicked();
        void on_btChooseWget_clicked();
        void on_btTblD2_2_clicked();
        void on_btTblD2_clicked();
        void on_btTblD1_clicked();
        void on_cbAppFont_clicked(bool checked);
        void on_spnAppFontSize_valueChanged(int );
        void on_cmbAppFont_currentFontChanged(QFont f);
        void on_spnHebrewFontSize_valueChanged(int );
        void on_cmbHebrewFont_currentFontChanged(QFont f);
        void on_spnGrkFontSize_valueChanged(int );
        void on_cmbGrkFont_currentFontChanged(QFont f);
        void on_spnLatinFontSize_valueChanged(int );
        void on_cmbLatinFont_currentFontChanged(QFont f);
        void on_cbCopticEditable_clicked();
        void on_btBkg_clicked();
        void on_btAppFonts_clicked();
        void on_btDir3_clicked();
        void on_btDir2_clicked();
        void on_btDir1_clicked();
        void on_spnCoptFontSize_valueChanged(int );
        void on_cmbCoptFont_currentFontChanged(QFont f);
        void on_btRestoreCfg_clicked();
        void on_btSaveCfg_clicked();
        void on_cbTLG_toggled(bool checked);
        void on_txtBkg_returnPressed();
private:
        Ui::frmSettings *ui;

        int writecfgline(QFile & f, QString str);
        QString	readcfgline(QFile & f) const;
        static QString	readcfgline_st(QFile & f);


        CMessages * messages;
        QTabWidget ** const _mtab;
        MSRWidget ** _sr_tab;
        MWindowsWidget * const _wnds;

        QList<QByteArray> ifmts;
        QString iffilters,ifcmp;

        void chooseTlgDir(QLineEdit * lineedit,QString const & caption);

        CTblDesigner bt,br,lsr;
        static QString _cfgfile;
        QString _tmpDir;

        QFont _cop_font,_gk_font,_lat_font,_hb_font;
signals:
        void fontChanged(CTranslit::Script, QFont);
        void settingsChanged(int);
        void copticEditModeChanged(bool);
        void resizeIcons(bool);
};

void set_m_sett(CSettings *);
CSettings * m_sett();

#endif
