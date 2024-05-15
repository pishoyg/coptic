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

#include "mainwnd.h"
#include "ui_mainwnd.h"

//Q_DECLARE_METATYPE(QMdiSubWindow*)
//Q_DECLARE_METATYPE(QWidget*)

//

MainWnd::MainWnd(MProgressIcon & splash,
                 QWidget *parent) :
    QMainWindow(parent),
    ui(new Ui::MainWnd),
    tri(QIcon(":/new/icons/icons/main.png"),this),
    sbLabel(),/*sbLibLabel(),*/sbILabel(),
    messages(&sbLabel,/*&sbLibLabel,*/&sbILabel,this,&settings,&tri,library_search,library),
    settings(&messages,&ui->tabMainApp,&ui->tabSearchResults,&opened_books),
    nam_ver(messages.version()),
    libTitle(),msgTitle(),libSTitle(),settTitle(),
    openBookTitle(),
    opened_books(openBookTitle.bt1(),openBookTitle.bt2()),
    library(&messages,libTitle),
    library_search((set_m_msg(&messages), set_m_sett(&settings),&messages),&library,libSTitle,&ui->tabSearchResults),
    _archW(&library,&ui->tabMainApp),
    txtLike(),wdgTcp(),
    idb(0),
    tri_menu(),tri_lang_menu(tr("&languages")),
    tri_wnds_menu(tr("&activate book")),
    wnds_menu(tr("&opened books")),
    wpr(0),wlsj(0),
    ta_lib(0),ta_libsrch(0),
    esett(),
    emsg(),
    _splash(splash)
{
    ui->setupUi(this);

    splash.incValue();

    if(CSettings::tcpServer)
    {
        connect(CSettings::tcpServer,SIGNAL(incomingFileToOpen(QString)),this,SLOT(slot_fileOpenRequest(QString)));
        connect(CSettings::tcpServer,SIGNAL(serverStopped()),this,SLOT(slot_tcpServerStopped()));
    }

    setMainWTitle();

    m_msg()->MsgMsg(tr("Marcion starts at ")+CSettings::app_start_time.toString(Qt::TextDate));

    m_msg()->MsgMsg(tr("temporary directory: '")+settings.tmpDir()+"'");

    libSTitle.setQueryLimit();
    CTranslit::init();
    CLSJ::init();

    initToolBar();

    //lay.addWidget(&idb);
    //idbd.setWindowTitle("coptic translator data");

    //cwnd.setAttribute(Qt::WA_DeleteOnClose,false);
    //cwidg.setAttribute(Qt::WA_DeleteOnClose,false);
    //cwnd.setWindowIcon(QIcon(":/new/icons/icons/alfa1.png"));

    QWidgetAction * waLike=new QWidgetAction(0);
    txtLike.setText("%%");
    waLike->setDefaultWidget(&txtLike);

    QWidgetAction * waTcp=new QWidgetAction(0);
    waTcp->setDefaultWidget(&wdgTcp);

    /*txtLike.show();
    wdgTcp.show();*/

    ui->menuShow_server_state->insertAction(ui->actionGlobal_variables,waLike);
    ui->menuTCP_server->insertAction(0,waTcp);

    //ui->mdiArea->setOption(QMdiArea::DontMaximizeSubWindowOnActivation,true);
    //ui->mdiArea->setActivationOrder(QMdiArea::ActivationHistoryOrder);

    settings.loadBackground();

    m_sett()->updButtonToolTips(messages);
    messages.MsgMsg(QString(tr("current application font: ")+QApplication::font().family()+tr(" size ")+QString::number(QApplication::font().pointSize())));

    connect(&settings,SIGNAL(copticEditModeChanged(bool)),this,SLOT(copticEditMode(bool)));

    connect(&library,SIGNAL(indexChanged(CLibSearchBase::IndexType)),&library_search,SLOT(indexChangedSlot(CLibSearchBase::IndexType)));
    connect(&_archW,SIGNAL(indexChanged(CLibSearchBase::IndexType)),&library_search,SLOT(indexChangedSlot(CLibSearchBase::IndexType)));

    //QLabel * el=new QLabel();
    //el->setSizePolicy(QSizePolicy::Expanding,QSizePolicy::Preferred);

    esett.setCheckable(true);
    esett.setToolTip(tr("settings"));
    esett.setIcon(QIcon(":/new/icons/icons/settings.png"));
    esett.setText(tr("sett"));
    esett.setToolButtonStyle(Qt::ToolButtonTextBesideIcon);

    emsg.setCheckable(true);
    emsg.setToolTip(tr("messages"));
    emsg.setIcon(QIcon(":/new/icons/icons/info.png"));
    emsg.setText(tr("msg"));
    emsg.setToolButtonStyle(Qt::ToolButtonTextBesideIcon);

    /*sbLibLabel.setFrameShape(QFrame::StyledPanel);
    sbLibLabel.setFrameShadow(QFrame::Sunken);
    sbLibLabel.setLineWidth(1);*/

    sbLabel.setFrameShape(QFrame::StyledPanel);
    sbLabel.setFrameShadow(QFrame::Sunken);
    sbLabel.setLineWidth(1);
    sbLabel.setToolTip(tr("all OK"));

    sbILabel.setFrameShape(QFrame::StyledPanel);
    sbILabel.setFrameShadow(QFrame::Sunken);
    sbILabel.setLineWidth(1);

    //esett.setSizePolicy(QSizePolicy::MinimumExpanding,QSizePolicy::Minimum);
    //emsg.setSizePolicy(QSizePolicy::MinimumExpanding,QSizePolicy::Minimum);

    //ui->statusbar->addPermanentWidget(&sbLibLabel,0);

    sbILabel.setSizePolicy(QSizePolicy::Preferred,QSizePolicy::Minimum);
    sbLabel.setSizePolicy(QSizePolicy::Preferred,QSizePolicy::Minimum);
    esett.setSizePolicy(QSizePolicy::Minimum,QSizePolicy::Minimum);
    emsg.setSizePolicy(QSizePolicy::Minimum,QSizePolicy::Minimum);

    ui->statusbar->addPermanentWidget(&sbILabel,0);
    ui->statusbar->addPermanentWidget(&sbLabel,0);
    ui->statusbar->addPermanentWidget(&esett,0);
    ui->statusbar->addPermanentWidget(&emsg,0);

    connect(&esett,SIGNAL(clicked()),this,SLOT(on_actionSettings_triggered()));
    connect(&emsg,SIGNAL(clicked()),this,SLOT(on_actionShow_messages_triggered()));

    connect(settings.sc(),SIGNAL(toggled(bool)),this,SLOT(settings_scan_toggled(bool)));
    connect(settings.scCop(),SIGNAL(toggled(bool)),this,SLOT(settings_scan_lang_toggled(bool)));
    connect(settings.scGk(),SIGNAL(toggled(bool)),this,SLOT(settings_scan_lang_toggled(bool)));
    connect(settings.scLat(),SIGNAL(toggled(bool)),this,SLOT(settings_scan_lang_toggled(bool)));
    connect(settings.tray(),SIGNAL(toggled(bool)),this,SLOT(settings_tray_toggled(bool)));
    settings_tray_toggled(settings.trayIsChecked());
    initTrayMenu();
    settings_scan_toggled(settings.scan());

    tri.setToolTip(messages.version());

    connect(&tri, SIGNAL(activated(QSystemTrayIcon::ActivationReason)),
                 this, SLOT(slot_trayIconActivated(QSystemTrayIcon::ActivationReason)));
    tri.setContextMenu(&tri_menu);
    connect(&tri_menu,SIGNAL(triggered(QAction*)),this,SLOT(slot_trayMenuTriggered(QAction*)));
    connect(&tri_lang_menu,SIGNAL(triggered(QAction*)),this,SLOT(slot_trayMenuLangTriggered(QAction*)));
    connect(&tri_wnds_menu,SIGNAL(aboutToShow()),this,SLOT(slot_mnuBooks_aboutToShow()));
    connect(&tri_wnds_menu,SIGNAL(triggered(QAction*)),this,SLOT(slot_bookMenuTriggered(QAction*)));
    connect(&wnds_menu,SIGNAL(aboutToShow()),this,SLOT(slot_mnuViewBooks_aboutToShow()));
    connect(&wnds_menu,SIGNAL(triggered(QAction*)),this,SLOT(slot_bookMenuTriggered(QAction*)));

    ui->menuView->addSeparator();
    ui->menuView->addMenu(&wnds_menu);

    //msgTitle.adjustSize();
    ui->dwiMsg->setWidget(&messages);
    ui->dwiMsg->setTitleBarWidget(&msgTitle);
    connect(&msgTitle,SIGNAL(request(int)),this,SLOT(slot_msgTitleRequest(int)));
    messages.show();
    //messages.adjustSize();

    ui->dwiSettings->setWidget(&settings);
    ui->dwiSettings->setTitleBarWidget(&settTitle);
    connect(&settTitle,SIGNAL(hide()),ui->dwiSettings,SLOT(hide()));
    settings.show();
    //settings.adjustSize();

    ui->dwiBooks->setWidget(&opened_books);
    ui->dwiBooks->setTitleBarWidget(&openBookTitle);
    connect(&openBookTitle,SIGNAL(hide()),ui->dwiBooks,SLOT(hide()));
    opened_books.show();

    ui->dwiMsg->show();
    ui->dwiSettings->hide();
    ui->dwiBooks->show();

    /*messages.MsgMsg("setting up 'character_set_%' session variable(s) ...");
    if(
    !(CMySql::setVar("character_set_results","utf8")
    &&
    CMySql::setVar("character_set_client","utf8")
    &&
    CMySql::setVar("character_set_connection","utf8"))
    )
        messages.MsgWarn("cannot set session variable(s)");
    else
        messages.MsgOk();*/

    if(!settings.isCopticEditable())
    {
        ui->actionNew_word->setVisible(false);
        ui->actionCreate_html_data->setEnabled(false);
        ui->action_re_create_index_of_Gk_Lat_dictionary->setEnabled(false);
    }

    library.load_tree(&splash);
    splash.incValue();
    library.loadHtmlLibrary(&messages,library.htmlTree(),false,&splash);
    splash.incValue();
    library.loadTlgCorp();
    splash.incValue();
    _archW.readCategories();
    splash.incValue();

    ui->dockLibrary->setWidget(&library);
    //libTitle.adjustSize();
    ui->dockLibrary->setTitleBarWidget(&libTitle);
    connect(&libTitle,SIGNAL(menuRequested()),&library,SLOT(slot_menu()));
    connect(&libTitle,SIGNAL(hideClicked(bool)),ui->dockLibrary,SLOT(setVisible(bool)));
    //connect(&libTitle,SIGNAL(detachClicked(bool)),ui->dockLibrary,SLOT(setFloating(bool)));
    ui->dockLibrary->setVisible(true);
    //library.show();
    //library.adjustSize();

    library_search.init();
    library.loadHtmlLibrary(&messages,library_search.htmlTree(),true,&splash);
    ui->layArchive->addWidget(&_archW);

    splash.incValue();

    //library_search.loadArchiveTree();
    //library.loadArchiveLibrary(0,library_search.ui->treeArchive,false,QString(),false);

    ui->dockSearchLibrary->setWidget(&library_search);
    ui->dockSearchLibrary->setTitleBarWidget(&libSTitle);
    connect(&libSTitle,SIGNAL(hide()),this,SLOT(slot_libSTitle_hide()));
    ui->dockSearchLibrary->setVisible(false);

    //library_search.show();
    //library_search.adjustSize();
    //library_search.resize(library_search.minimumSizeHint());

    connect(&settings,SIGNAL(settingsChanged(int)),this,SLOT(slot_settingsChanged(int)));

    slot_resizeIcons(true);
    slot_resizeIcons(false);

    connect(&settings,SIGNAL(resizeIcons(bool)),this,SLOT(slot_resizeIcons(bool)));

    restoreWState();
    loadRecentFiles();

    m_msg()->MsgMsg(QString::number(CSettings::openFiles.count())+tr(" files to open (command line)"));
    for(int x=0;x<CSettings::openFiles.count();x++)
        library.openHtmlBook(&messages,CSettings::openFiles.at(x),CLibraryWidget::Auto);
    CSettings::openFiles.clear();

    QDateTime dt=QDateTime::currentDateTime();
    double s=(double)CSettings::app_start_time.msecsTo(dt)/1000;
    m_msg()->MsgMsg(tr("startup finished in ")+QString::number(s,'f',2)+tr(" seconds"));
    REST_CURSOR


    messages.goToTop();
    if(messages.lastError().isEmpty())
        ui->statusbar->showMessage(messages.version()+tr(" started successfully."),20000);
    else
    {
        ui->dwiMsg->show();
        ui->statusbar->showMessage(messages.version()+tr(" started with errors."),20000);
    }

    _splash.stopTimer();
    //QTimer::singleShot(1000,&_splash,SLOT(close()));
    _splash.close();

    adjustSize();
    showMaximized();
    activateWindow();

    if(m_sett()->tipAtStartup())
        on_actionShow_tip_triggered();
}

MainWnd::~MainWnd()
{
    if(!CSettings::_ro_mode)
    {
        storeRecentFiles();
        saveWState();
    }
    else
        m_msg()->MsgMsg(tr("--from-ro-media argument is set, writing of application state skipped"));

    if(idb)
        delete idb;
    if(wpr)
        delete wpr;
    if(wlsj)
        delete wlsj;

    delete ui;
}

/*void MainWnd::removeAllWindows()
{
    ui->mdiArea->closeAllSubWindows();
    //setMainWTitle();
}*/

/*void MainWnd::minimizeAllWindows()
{
    QList<QMdiSubWindow*> wl=ui->mdiArea->subWindowList();
    QMdiSubWindow * sw;
    foreach(sw,wl)
        if(sw->isVisible())
            sw->showMinimized();

    //setMainWTitle();
}*/

/*void MainWnd::maximizeAllWindows()
{
    QList<QMdiSubWindow*> wl=ui->mdiArea->subWindowList();
    QMdiSubWindow * sw;
    foreach(sw,wl)
        if(sw->isVisible())
            sw->showMaximized();
}*/

void MainWnd::on_actionSettings_triggered()
{
    ui->dwiSettings->setVisible(!ui->dwiSettings->isVisible());
}

void MainWnd::on_actionNew_word_triggered()
{
    CAddWord * nw=new CAddWord(&messages,-1,CAddWord::InsertWord);
    if(nw)
        nw->show();
}

void MainWnd::on_actionQuery_triggered()
{
    CWordPreview * wp=new CWordPreview(&messages);
    if(wp)
    {
        wp->show();
        m_sett()->wnds()->addNewWindow(wp);
    }
}

void MainWnd::on_actionQuit_triggered()
{
    close();
}

void MainWnd::on_actionOpen_book_triggered()
{
        QFileDialog fd(0,tr("open book"),"library");

        fd.setAcceptMode(QFileDialog::AcceptOpen);
        fd.setFileMode(QFileDialog::ExistingFiles);
        fd.setWindowIcon(windowIcon());

        QStringList filters;

        filters.append("all (*)");
#ifndef NO_DJVIEW
        filters.append("djvu (*.djvu)");
#endif
        filters.append("web (*.htm *.html)");
#ifndef NO_POPPLER
        filters.append("pdf (*.pdf)");
#endif
        filters.append("text (*.txt)");
        //filters.append("rich text (*.rtf)");
        filters.append(settings.imageFormatsFilters());

        fd.setNameFilters(filters);

        if(fd.exec()==QDialog::Accepted)
        {
            library.openHtmlBook(&messages,fd.selectedFiles().first(),CLibraryWidget::Auto);
        }
}

/*void MainWnd::on_cmbLetter_triggered(QString str)
{
        int index=cmbLetter->findText(CTranslit::to
                (str,CTranslit::Copt));
        if(index!=-1)
                cmbPages->setCurrentIndex(
                        cmbLetter->itemData(index).toInt()-1);
}*/

void MainWnd::on_actionPlumley_triggered()
{
        CGrammar * gr=new CGrammar();
        gr->setWindowTitle("Coptic grammar, J. M. Plumley");
        gr->show();
        m_sett()->wnds()->addNewWindow(gr);
}

void MainWnd::on_actionClear_messages_triggered()
{
    messages.clear();
}

void MainWnd::on_actionTattam_triggered()
{
    MDjvuReader2 * dj_r=new MDjvuReader2(QDir::toNativeSeparators("data/djvu/tattam.djvu"));
    dj_r->view().setStencil();
    dj_r->showPanel();

    QList<QPair<QString,QVariant> > items;
    items << QPair<QString,QVariant>("Content",(-1)+31) <<
            QPair<QString,QVariant>("Chap. I - The Alphabet",1+31) <<
    QPair<QString,QVariant>("Chap. II - Pronunciation of the letters",3+31)  <<
    QPair<QString,QVariant>("Chap. III - Of Points and Abreviations",7+31) <<
    QPair<QString,QVariant>("Chap. III - Part II. Etymology. Articles",10+31) <<
    QPair<QString,QVariant>("Chap. IV - Of Nouns",13+31) <<
    QPair<QString,QVariant>("Chap. IV - Cases of Nouns",21+31) <<
    QPair<QString,QVariant>("Chap. V - Of Adjectives",24+31) <<
    QPair<QString,QVariant>("Chap. VI - Of Personal and Relative Pronouns",27+31) <<
    QPair<QString,QVariant>("Chap. VI - Pronoun Infixes and Suffixes",35+31) <<
    QPair<QString,QVariant>("Chap. VI - Cardinal and Ordinal Numbers",41+31) <<
    QPair<QString,QVariant>("Chap. VII - Of Verbs",45+31) <<
    QPair<QString,QVariant>("Chap. VII - Prefixes and Suffixes",45+31) <<
    QPair<QString,QVariant>("Chap. VII - Verbs united with particles",65+31) <<
    QPair<QString,QVariant>("Chap. VII - Participles",78+31) <<
    QPair<QString,QVariant>("Chap. VII - Negative Prefixes",79+31) <<
    QPair<QString,QVariant>("Chap. VII - Auxiliary verb ThRE and TRE",89+31) <<
    QPair<QString,QVariant>("Chap. VII - Irregular and defective Verbs",91+31) <<
    QPair<QString,QVariant>("Chap. VII - Adverbs and Conjunctions",99+31) <<
    QPair<QString,QVariant>("Chap. VII - Prepositions",100+31) <<
    QPair<QString,QVariant>("Chap. VIII - Formation of words",104+31) <<
    QPair<QString,QVariant>("Chap. VIII - Dialects",106+31) <<
    QPair<QString,QVariant>("Chap. VIII - Praxis of the first Chap. of John",110+31) <<
    QPair<QString,QVariant>("Index",117+31);


    dj_r->fillContent(items);
    dj_r->setWindowTitle("Compendious Grammar");
    dj_r->show();
    m_sett()->wnds()->addNewWindow(dj_r);
}

void MainWnd::on_actionView_library_triggered()
{
    if(!library.isLoaded())
        library.load_tree();
    ui->dockLibrary->setVisible(!ui->dockLibrary->isVisible());
}

void MainWnd::on_actionOpen_TLG_PHI_triggered()
{
    try { CTlgSelector2 ts(settings.dir1(),
                     settings.dir2(),
                     settings.dir3(),this);


    ts.setWindowTitle(tr("open TLG/PHI text"));
    //try {
            if(ts.exec()==QDialog::Accepted)
            {
                USE_CLEAN_WAIT

                CBookReader::Format br_f;
                CTranslit::Script scr;
                CBookTextBrowser::Script btscr;

                if(ts.selected_corpora()=="COP")
                {
                    br_f=CBookReader::TlgCoptic;
                    scr=CTranslit::Copt;
                    btscr=CBookTextBrowser::Coptic;
                }
                else
                {
                    br_f=CBookReader::TlgGreek;
                    scr=CTranslit::Greek;
                    btscr=CBookTextBrowser::Greek;
                }

                CBookReader * br=new CBookReader(&messages,QString(),br_f,btscr);

                switch(btscr)
                {
                case CBookTextBrowser::Coptic :
                    {
                        QFont f(messages.settings().tlgCopticFont());
                        f.setPointSize(messages.settings().tlgCopticFontSize());
                        br->setFont(f);
                        break;
                    }
                case CBookTextBrowser::Greek :
                    {
                        QFont f(messages.settings().tlgGreekFont());
                        f.setPointSize(messages.settings().tlgGreekFontSize());
                        br->setFont(f);
                        break;
                    }
                default:
                    break;
                }


                //br->append(CTranslit::betaToUtf("word1 <ab> word2",CTranslit::Copt));
                IbycusTxtFile ibf(ts.selected_author().second,ts.selected_author().first);

                //QFile f("data/backup/out.txt");
                //f.open(QIODevice::WriteOnly);

                    ibf.Start(0,ts.selected_work());
                    do
                    {
                        //cout << i++;
                        //ibf.Start(0,ts.selected_work());
                        //for(int x=0;!ibf.eos();x++)
                        //{
                            QString t(ibf.Text().c_str());
                            if(ts.utf())
                            {
                                //cout << ibf.Id();
                                QString fw(QString(ibf.Id().ToString(IbycusId::fmt_work).c_str())+"\t"+
                                CTranslit::betaToUtf(t,scr));

                                br->append(fw);
                                //br->append(QString(
             //QString(ibf.Id().ToString(IbycusId::fmt_work).c_str())+"\t"+
         //CTranslit::betaToUtf(t,scr)+"\n").toUtf8());
                            }
                            else
                                //f.write(
             //(QString(ibf.Id().ToString(IbycusId::fmt_work).c_str())+"\t"+t+"\n").toUtf8());
                                br->append(
             QString(ibf.Id().ToString(IbycusId::fmt_work).c_str())+"\t"+t);
                                //br->append(t);

                            ibf.Next();

                        //}
                    }while(!ibf.eoa());
                    //}while(!ibf.eow());

                    //f.close();
                br->setWindowTitle("TLG/PHI work");
                br->browser()->moveCursor(QTextCursor::Start);
                //ui->mdiArea->addSubWindow(br);
                br->show();
            }
        }
        catch (...)
        {
            messages.MsgErr(tr("exception"));
            return;
        }
}

/*void MainWnd::treeResult_itemDoubleClicked(QTreeWidgetItem* item, int )
{
    CBookWithVerses * b= new CBookWithVerses(item->text(1),(CBookWithVerses::Script)item->text(6).toInt(),
                                             item->text(2).toInt(),CBookWithVerses::Chapter,&messages,0);
    b->setWindowTitle(item->text(1));
    mdiArea->addSubWindow(b);
    b->show();

    b->findVerse(item->text(3).toInt(),
                 item->text(4).toInt());
}*/

/*void MainWnd::on_dockLibrary_visibilityChanged(bool visible)
{
    ui->actionView_library->setChecked(visible);
}*/

void MainWnd::on_actionSearch_library_triggered()
{
    ui->dockSearchLibrary->setVisible(!ui->dockSearchLibrary->isVisible());
}

/*void MainWnd::on_dockSearchLibrary_visibilityChanged(bool visible)
{
    ui->actionSearch_library->setChecked(visible);
}*/

void MainWnd::on_actionQuery_LSJ_triggered()
{
    CLSJ * wp=new CLSJ(&messages);
    if(wp)
    {
        wp->show();
        m_sett()->wnds()->addNewWindow(wp);
    }
}

void MainWnd::on_action_Hebrew_triggered()
{
    MHebrDict * heb=new MHebrDict();
    if(heb){
        heb->show();
        m_sett()->wnds()->addNewWindow(heb);
    }
}

void MainWnd::on_actionCrum_triggered()
{
    CCrumWidget * cwidg=new CCrumWidget(&messages);
    if(cwidg)
    {
        cwidg->setWindowTitle("W. E. Crum");
        cwidg->setAttribute(Qt::WA_DeleteOnClose,false);
        cwidg->setWindowIcon(QIcon(":/new/icons/icons/alfa1.png"));

        cwidg->show();
        m_sett()->wnds()->addNewWindow(cwidg);
    }
}

/*void MainWnd::deactivateAllWindows()
{
    ui->mdiArea->setActiveSubWindow(0);
}*/

/*void MainWnd::menuitems_show()
{
    setMainWTitle();
    ui->menuItems->clear();


    QAction * min_all=ui->menuItems->addAction(tr("&minimize all")),
        *max_all=ui->menuItems->addAction(tr("m&aximize all")),
        *rm_all=ui->menuItems->addAction(tr("&close all")),
        *noacw=ui->menuItems->addAction(tr("&deactivate all")),
        *casc=ui->menuItems->addAction(tr("ca&scade all")),
        *tile=ui->menuItems->addAction(tr("a&rrange all"));

    ui->menuItems->addSeparator();


    connect(min_all,SIGNAL(triggered()),this,SLOT(minimizeAllWindows()));
    connect(max_all,SIGNAL(triggered()),this,SLOT(maximizeAllWindows()));
    connect(rm_all,SIGNAL(triggered()),this,SLOT(removeAllWindows()));
    connect(noacw,SIGNAL(triggered()),this,SLOT(deactivateAllWindows()));
    connect(casc,SIGNAL(triggered()),ui->mdiArea,SLOT(cascadeSubWindows()));
    connect(tile,SIGNAL(triggered()),ui->mdiArea,SLOT(tileSubWindows()));

    QList<QMdiSubWindow*> l(ui->mdiArea->subWindowList());

    QMdiSubWindow *i;
    foreach(i,l)
        if(i->isVisible())
        {
            QAction *a=ui->menuItems->addAction(i->widget()->windowTitle());
            a->setIcon(i->windowIcon());
            a->setData(QVariant::fromValue(i));
            connect(a,SIGNAL(triggered()),this,SLOT(select_window()));
        }

    ui->menuItems->addSeparator();
    QWidgetList wl(QApplication::topLevelWidgets());
    QWidget * w;
    QMenu * detw=new QMenu(tr("a&ttach"));
    foreach(w,wl)
    {
        if(w->isWindow()&&detached.indexOf(w)!=-1)
        {
            QAction *a=ui->menuItems->addAction(w->windowTitle());
            a->setIcon(w->windowIcon());
            a->setData(QVariant::fromValue((QMdiSubWindow*)w));
            QAction *b=detw->addAction(a->text());
            b->setIcon(a->icon());
            b->setData(QVariant::fromValue((QMdiSubWindow*)w));

            connect(a,SIGNAL(triggered()),this,SLOT(slot_activateDetached()));
            connect(b,SIGNAL(triggered()),this,SLOT(slot_attachDetached()));
        }
    }
    detw->addSeparator();
    QAction *attall=detw->addAction(tr("&all"));
    connect(attall,SIGNAL(triggered()),this,SLOT(slot_attachAll()));
    if(detw->actions().count()>2)
        ui->menuItems->addMenu(detw);

    QMdiSubWindow *curr=ui->mdiArea->currentSubWindow();
    if(curr)
    {
        if(curr->isVisible())
        {
            ui->menuItems->addSeparator();
            QAction *a=ui->menuItems->addAction(tr("detac&h ")+curr->windowTitle());
            a->setData(QVariant::fromValue(curr));
            connect(a,SIGNAL(triggered()),this,SLOT(slot_detachSubW()));
        }
    }

    QAction *detall=ui->menuItems->addAction(tr("detach all"));
    connect(detall,SIGNAL(triggered()),this,SLOT(slot_detachAll()));
}*/

/*void MainWnd::slot_attachAll()
{
    QMessageBox mb(QMessageBox::Question,tr("marcion - attach windows"),tr("All detached windows will be attached. Continue?"),QMessageBox::Ok|QMessageBox::Cancel);
    if(mb.exec()==QMessageBox::Ok)
    {
        QWidgetList wl(QApplication::topLevelWidgets());
        QWidget * wd;
        foreach(wd,wl)
        {
            if(wd->isWindow()&&detached.indexOf(wd)!=-1)
            {
                QMdiSubWindow *w((QMdiSubWindow*)wd);
                messages.MsgMsg(tr("attaching window ")+w->windowTitle()+" ...");

                if(w==&cwnd)
                {
                    //cwnd.setWidget(&cwidg);
                    ui->mdiArea->addSubWindow(&cwnd);
                    cwidg.showNormal();
                    cwnd.show();
                }
                else if(w==&idbwnd)
                {
                    //idbwnd.setWidget(idb);
                    ui->mdiArea->addSubWindow(&idbwnd);
                    idb->showNormal();
                    idbwnd.show();
                }
                else
                {
                    //w->widget()->show();
                    QMdiSubWindow *sw=ui->mdiArea->addSubWindow(w);
                    sw->widget()->showNormal();
                    sw->show();
                }
            }
        }
        detached.clear();

        ui->mdiArea->setActiveSubWindow(0);
    }
}

void MainWnd::slot_detachAll()
{
    QMessageBox mb(QMessageBox::Question,tr("marcion - detach windows"),tr("All windows will be detached. Continue?"),QMessageBox::Ok|QMessageBox::Cancel);
    if(mb.exec()==QMessageBox::Ok)
    {
        QList<QMdiSubWindow*> wl=ui->mdiArea->subWindowList();
        QMdiSubWindow * w;
        foreach(w,wl)
        {
            if(w->isVisible())
            {
                messages.MsgMsg(tr("detaching window ")+w->windowTitle()+" ...");

                ui->mdiArea->removeSubWindow(w);
                detached.append(w);
                QPoint wpos=w->pos();
                if(wpos.x()<0)
                    wpos.setX(0);
                if(wpos.y()<0)
                    wpos.setY(0);
                if(wpos!=w->pos())
                    w->move(wpos);
                w->widget()->showMinimized();
                w->show();
            }
        }
    }
}

void MainWnd::slot_attachDetached()
{
    QMdiSubWindow * w=((QAction*)this->sender())->data().value<QMdiSubWindow*>();
    //QWidget * wd(w->widget());

    messages.MsgMsg(tr("attaching window ")+w->windowTitle()+" ...");

    detached.removeOne(w);
    ui->mdiArea->setActiveSubWindow(0);
    if(w==&cwnd)
    {
        //messages.MsgMsg("cr");
        //cwnd.setWidget(&cwidg);
        ui->mdiArea->addSubWindow(&cwnd);
        cwidg.showNormal();
        //cwnd.showNormal();
        cwnd.show();
        return;
    }
    else if(w==&idbwnd)
    {
        //messages.MsgMsg("cr");
        //idbwnd.setWidget(idb);
        ui->mdiArea->addSubWindow(&idbwnd);
        idb->showNormal();
        //idbwnd.showNormal();
        cwnd.show();
        return;
    }
    else
    {
        //w->setWidget(0);
        //wd->setParent(0);
        //w->close();
        //w->widget()->show();
        QMdiSubWindow *sw=ui->mdiArea->addSubWindow(w);
        sw->widget()->showNormal();
        sw->show();
    }


    //ui->mdiArea->setActiveSubWindow(sw);
    //w->showNormal();
    //mw->showNormal();

    //ui->mdiArea->setActiveSubWindow(mw);
}

void MainWnd::slot_activateDetached()
{
    QMdiSubWindow * w=((QAction*)this->sender())->data().value<QMdiSubWindow*>();

    //messages.MsgMsg("attaching window "+w->windowTitle()+" ...");
    if(w==&cwnd)
        cwidg.show();
    else if(w==&idbwnd)
        idb->show();

    w->activateWindow();
}

void MainWnd::slot_detachSubW()
{
    QMdiSubWindow * w=((QAction*)this->sender())->data().value<QMdiSubWindow*>();

    if(w)
    {
            messages.MsgMsg(tr("detaching window ")+w->windowTitle()+" ...");
            //QWidget * wdg(w->widget());
            //w->setParent(0);
            ui->mdiArea->removeSubWindow(w);
            //((MWnd*)w->widget())->detach(ui->mdiArea);
            detached.append(w);
            QPoint wpos=w->pos();
            if(wpos.x()<0)
                wpos.setX(0);
            if(wpos.y()<0)
                wpos.setY(0);
            if(wpos!=w->pos())
                w->move(wpos);
            w->widget()->showNormal();
            w->show();
            w->activateWindow();
        //}
    }
}

void MainWnd::select_window()
{
    QMdiSubWindow * w=((QAction*)this->sender())->data().value<QMdiSubWindow*>();
    w->setFocus();
}*/

void MainWnd::showVariables(QString const & vars)
{
    QString query(QString("show "+vars+" variables like '"+txtLike.text()+"'"));
    messages.MsgMsg(tr("executing query '")+query+"' ...");
    CMySql q(query);
    if(!q.exec())
    {
        messages.MsgErr(q.lastError());
        return;
    }

    messages.MsgMsg(QString(vars+" variables:"));
    while(q.next())
    {
        QString var(q.value(0)),
            val(q.value(1));
        messages.MsgMsg(var+" - "+val);
    }

    messages.MsgOk();
}

/*bool MainWnd::check_updates(bool closeConn)
{
    CMySqlConnection c(&messages);
    if(c.connect())
    {
        QString queryR("select `maxdate`,extract(year from `maxdate`),extract(month from `maxdate`),extract(day from`maxdate`) from (select greatest(max(`max_a`),max(`max_u`)) as `maxdate` from (select max(`added`) as `max_a`,max(`updated`) as `max_u` from `coptwrd` union select max(`added`) as `max_a`,max(`updated`) as `max_u` from `coptdrv`) as `t1`) as `t2`");
        QString queryL("select `maxdate`,extract(year from `maxdate`),extract(month from `maxdate`),extract(day from`maxdate`) from (select greatest(max(`max_a`),max(`max_u`)) as `maxdate` from (select max(`added`) as `max_a`,max(`updated`) as `max_u` from `coptwrd` union select max(`added`) as `max_a`,max(`updated`) as `max_u` from `coptdrv`) as `t1`) as `t2`");
        CMySql qL(queryL),qR(queryR,CMySql::Remote);

        messages.MsgMsg("executing query \""+queryL+"\" ...");
        if(!qL.exec())
        {
            messages.MsgErr(qL.lastError());
            c.disconnect();
            return false;
        }

        if(!qL.first())
        {
            messages.MsgErr("something wrong");
            c.disconnect();
            return false;
        }

        messages.MsgMsg("executing query \""+queryR+"\" ...");
        if(!qR.exec())
        {
            messages.MsgErr(qR.lastError());
            c.disconnect();
            return false;
        }

        if(!qR.first())
        {
            messages.MsgErr("something wrong");
            c.disconnect();
            return false;
        }

        QDate lDate(qL.value(1).toInt(),
                    qL.value(2).toInt(),
                    qL.value(3).toInt()),
              rDate(qR.value(1).toInt(),
                  qR.value(2).toInt(),
                  qR.value(3).toInt());

        messages.MsgMsg("local- last update: "+lDate.toString("yyyy-MM-dd")+"\nremote- last update: "+rDate.toString("yyyy-MM-dd"));

        bool r(false);
        if(rDate>lDate)
        {
            messages.MsgMsg("New updates are available.");
            r=true;
            if(closeConn)
                c.disconnect();
        }
        else
        {
            messages.MsgMsg("No new updates.");
            c.disconnect();
            r=false;
        }


        messages.MsgOk();

        return r;
    }

    return false;
}*/

/*void MainWnd::update(CMySql::Dbase from,
                        CMySql::Dbase to)
{
    CUpdate updd(this);
    updd.setWindowTitle("update coptic dictionary");

    if(updd.exec()==QDialog::Accepted)
    {
        CMySqlConnection c(&messages);
        if(c.connect())
        {
            CMySql chqF("select count(*) from `coptwrd` union select count(*) from `coptdrv`",from);
            if(!chqF.exec())
            {
                messages.MsgErr(chqF.lastError());
                c.disconnect();
                return;
            }
            if(!chqF.first())
            {
                messages.MsgErr("something wrong");
                c.disconnect();
                return;
            }
            int maxwrd=chqF.value(0).toInt();
            if(!chqF.next())
            {
                messages.MsgErr("something wrong");
                c.disconnect();
                return;
            }

            int maxdrv=chqF.value(0).toInt(),
                completed=0;

            messages.prepPBar(maxwrd+maxdrv);

            QString query("select `key`,quote(`word`),quote(`cz`),quote(`en`),quote(`gr`),quote(`crum`),`type`,`quality`,quote(`added`),quote(`updated`) from `coptwrd`");
            CMySql q(query,from);

            messages.MsgMsg("executing query \""+query+"\" ...");
            messages.repaintMainW();

            if(!q.exec())
            {
                messages.MsgErr(q.lastError());
                c.disconnect();
                return;
            }

            QString trunc("truncate table `coptwrd`");
            CMySql qtr(trunc,to);
            messages.MsgMsg(trunc);
            messages.repaintMainW();

            if(!qtr.exec())
            {
                messages.MsgErr(q.lastError());
                c.disconnect();
                return;
            }

            while(q.next())
            {
                QString rquery("insert into `coptwrd` (`key`,`word`,`cz`,`en`,`gr`,`crum`,`type`,`quality`,`added`,`updated`) values ("+
                     q.value(0)+","+
                     q.value(1)+","+
                     q.value(2)+","+
                     q.value(3)+","+
                     q.value(4)+","+
                     q.value(5)+","+
                     q.value(6)+","+
                     q.value(7)+","+
                     q.value(8)+","+
                     q.value(9)+")"
                     );
                CMySql qr(rquery,to);

                if(updd.detailed())
                    messages.MsgMsg(rquery);
                messages.repaintMainW();

                if(!qr.exec())
                {
                    messages.MsgMsg(qr.lastError());
                    c.disconnect();
                    return;
                }
                ++completed;
                messages.incPBar();
            }

            QString query2("select `key`,`key_word`,quote(`word`),quote(`cz`),quote(`en`),quote(`gr`),quote(`crum`),`type`,quote(`added`),quote(`updated`) from `coptdrv`");
            CMySql q2(query2,from);

            messages.MsgMsg("executing query \""+query2+"\" ...");
            messages.repaintMainW();

            if(!q2.exec())
            {
                messages.MsgErr(q2.lastError());
                c.disconnect();
                return;
            }

            QString trunc2("truncate table `coptdrv`");
            CMySql qtr2(trunc2,to);
            messages.MsgMsg(trunc2);
            messages.repaintMainW();

            if(!qtr2.exec())
            {
                messages.MsgErr(q2.lastError());
                c.disconnect();
                return;
            }

            while(q2.next())
            {
                QString rquery2("insert into `coptdrv` (`key`,`key_word`,`word`,`cz`,`en`,`gr`,`crum`,`type`,`added`,`updated`) values ("+
                     q2.value(0)+","+
                     q2.value(1)+","+
                     q2.value(2)+","+
                     q2.value(3)+","+
                     q2.value(4)+","+
                     q2.value(5)+","+
                     q2.value(6)+","+
                     q2.value(7)+","+
                     q2.value(8)+","+
                     q2.value(9)+")"
                     );
                CMySql qr2(rquery2,to);
                if(updd.detailed())
                    messages.MsgMsg(rquery2);
                messages.repaintMainW();

                if(!qr2.exec())
                {
                    messages.MsgMsg(qr2.lastError());
                    c.disconnect();
                    return;
                }
                ++completed;
                messages.incPBar();
            }

            if(from==CMySql::Remote)
            {
                QString u("insert into `updates` (`host`,`date`) values (user(),now())");
                CMySql uq(u,CMySql::Remote);

                messages.MsgMsg("executing query \""+u+"\" ...");
                if(!uq.exec())
                    messages.MsgWarn(uq.lastError());
            }

            CMySql chqL("select count(*) from `coptwrd` union select count(*) from `coptdrv`");
            CMySql chqR("select count(*) from `coptwrd` union select count(*) from `coptdrv`",CMySql::Remote);


                if(!(chqL.exec()&&
                chqR.exec()))
                {
                    messages.MsgErr(chqL.lastError()+
                                    chqR.lastError()
                                    );
                    c.disconnect();
                    return;
                }
                if(!(chqL.first()&&
                chqR.first()))
                {
                    messages.MsgErr("something wrong");
                    c.disconnect();
                    return;
                }
                QString t1L(chqL.value(0)),
                        t1R(chqR.value(0));
                if(!(chqL.next()&&
                chqR.next()))
                {
                    messages.MsgErr("something wrong");
                    c.disconnect();
                    return;
                }
                QString t2L(chqL.value(0)),
                        t2R(chqR.value(0));
                messages.MsgMsg(QString::number(maxwrd)+"+"+
                                QString::number(maxdrv)+"="+
                                QString::number(maxwrd+maxdrv)+"/ real: "+QString::number(completed));
                messages.MsgMsg("local- table 1: "+t1L+" table 2: "+t2L+"\nremote- table 1: "+t1R+" table 2: "+t2R);

            c.disconnect();
            messages.MsgOk();
        }
    }
}*/

/*void MainWnd::on_actionUpdateLocal_triggered()
{
    if(check_updates(false))
    {
        update(CMySql::Remote,CMySql::Local);
        CMySqlConnection(&messages).disconnect();
        messages.MsgOk();
    }
}*/

/*void MainWnd::on_actionUpdateRemote_triggered()
{
    update(CMySql::Local,CMySql::Remote);
}*/

/*void MainWnd::on_actionCheck_for_updates_triggered()
{
    check_updates(true);
}*/

int MainWnd::import(QString const & dir)
{
    QFileDialog fd(this,tr("import data"),QDir::toNativeSeparators(dir),"bzipped msql files (*.msql.bz2);;msql files (*.msql);;all files (*)");
    fd.setAcceptMode(QFileDialog::AcceptOpen);
    fd.setFileMode(QFileDialog::ExistingFiles);
    if(fd.exec())
    {
        USE_CLEAN_WAIT
        QStringList sf(fd.selectedFiles());
        if(sf.count()<1)
            return -1;

        QString s,txt(tr("Files \n\n"));
        foreach(s,sf)
            txt.append(s+"\n");
        QMessageBox mb(QMessageBox::Question,tr("data import"),txt+tr("\nwill be imported. Continue?"),QMessageBox::Cancel|QMessageBox::Ok,this);
        if(mb.exec()!=QMessageBox::Ok)
            return -1;

        int rv=0;
        for(int q=0;q<sf.count();q++)
        {
            QString fn(sf.at(q));
            if(fn.endsWith(".bz2"))
            {
                if(CMBzip(fn,&messages).decompress())
                    fn.remove(QRegExp("\\.bz2$"));
                else
                    return 1;
            }

            QFile f(fn);
            if(f.open(QIODevice::ReadOnly))
            {
                CProgressDialog pd;
                pd.show();

                messages.MsgMsg(tr("importing file '")+fn+"' ...");
                QStringList alldata(QString::fromUtf8(f.readAll().data()).split(CMySql::delimiter,QString::SkipEmptyParts));
                f.close();

                pd.initProgress(tr("import: file '")+fn+"' ...",alldata.size());

                QString line;
                foreach(line,alldata)
                {
                    CMySql q(line.trimmed());
                    if(!q.exec())
                    {
                        messages.MsgErr(q.lastError());
                        return rv;
                    }
                    if(pd.stopped())
                    {
                        messages.MsgInf(tr("interupted"));
                        return rv;
                    }
                    pd.incProgress();
                }
                messages.MsgMsg(tr("operation completed"));
                messages.MsgOk();
            }
            else
            {
                messages.MsgErr(tr("cannot open file '")+fn+tr("' for reading"));
                return rv;
            }
            rv++;
        }
        return -2;
    }
    else return -1;
}

/*void MainWnd::on_actionImport_collection_triggered()
{
    int i=import("data/backup");
    if(i==-2)
        messages.MsgInf(tr("All data were successfully imported.\nIf imported data contains collection(s) of texts,\nhighlight it in library window and create index for it\nand make text searchable."));
    else if(i>0)
        messages.MsgInf(tr("Data were partially imported, error(s) occured.\nIf succesfully imported data contains collection(s) of texts,\nhighlight it in library window and create index for it\nand make text searchable."));

}*/

void MainWnd::on_actionShow_messages_triggered()
{
    ui->dwiMsg->setVisible(!ui->dwiMsg->isVisible());
}

void MainWnd::on_dwiMsg_visibilityChanged(bool visible)
{
    //ui->actionShow_messages->setChecked(visible);
    emsg.setChecked(visible);
    ui->actionShow_messages->setChecked(visible);
}

void MainWnd::backupCrum()
{
    QFileDialog fdt(this,tr("export coptic tables"),QDir::toNativeSeparators("data/backup"),"msql files (*.msql);;all files (*)");
    fdt.setAcceptMode(QFileDialog::AcceptSave);
    fdt.setFileMode(QFileDialog::AnyFile);
    fdt.setDefaultSuffix("msql");

    if(fdt.exec())
    {
        CProgressDialog pd;
        pd.show();

        QString fn(fdt.selectedFiles().first());

        QFile f(fn);
        if(f.open(QIODevice::WriteOnly))
        {
            CMySql chqF("select count(*) from `coptwrd` union select count(*) from `coptdrv`");
            if(!chqF.exec())
            {
                messages.MsgErr(chqF.lastError());
                return;
            }
            if(!chqF.first())
            {
                messages.MsgErr(tr("something wrong"));
                return;
            }
            int maxwrd=chqF.value(0).toInt();
            if(!chqF.next())
            {
                messages.MsgErr(tr("something wrong"));
                return;
            }

            int maxdrv=chqF.value(0).toInt(),
                completed=0;

            pd.initProgress(tr("backup ..."),maxwrd+maxdrv+4);

            QString ts1;
            CMySql sct1("show create table `coptwrd`");
            if(sct1.exec())
            {
                if(sct1.first())
                    ts1=sct1.value(1).trimmed();
                else
                {
                    messages.MsgErr(tr("cannot obtain table structure of `coptwrd`"));
                    return;
                }
            }
            else
            {
                messages.MsgErr(sct1.lastError());
                return;
            }

            QString ts2;
            CMySql sct2("show create table `coptdrv`");
            if(sct2.exec())
            {
                if(sct2.first())
                    ts2=sct2.value(1).trimmed();
                else
                {
                    messages.MsgErr(tr("cannot obtain table structure of `coptdrv`"));
                    return;
                }
            }
            else
            {
                messages.MsgErr(sct1.lastError());
                return;
            }

            if(
            f.write(QString("drop table if exists `coptwrd`"+CMySql::delimiter).toUtf8())==-1 ||
            f.write(QString(ts1+CMySql::delimiter).toUtf8())==-1 ||
            f.write(QString("drop table if exists `coptdrv`"+CMySql::delimiter).toUtf8())==-1 ||
            f.write(QString(ts2+CMySql::delimiter).toUtf8())==-1
            )
            {
                messages.MsgErr(tr("cannot write into file \"")+fn+"\"");
                return;
            }

            pd.setProgress(completed+=4);

            QString query("select `key`,quote(`word`),quote(`cz`),quote(`en`),quote(`gr`),quote(`crum`),`type`,`quality`,quote(`added`),quote(`updated`),quote(`created_by`),quote(`updated_by`) from `coptwrd`");
            CMySql q(query);

            messages.MsgMsg(tr("executing query '")+query+"' ...");

            if(!q.exec())
            {
                messages.MsgErr(q.lastError());
                return;
            }

            while(q.next())
            {
                QString l("insert into `coptwrd` (`key`,`word`,`cz`,`en`,`gr`,`crum`,`type`,`quality`,`added`,`updated`,`created_by`,`updated_by`) values ("+
                     q.value(0)+","+
                     q.value(1)+","+
                     q.value(2)+","+
                     q.value(3)+","+
                     q.value(4)+","+
                     q.value(5)+","+
                     q.value(6)+","+
                     q.value(7)+","+
                     q.value(8)+","+
                     q.value(9)+","+
                     q.value(10)+","+
                     q.value(11)+")"+CMySql::delimiter
                     );


                if(f.write(l.toUtf8())==-1)
                {
                    messages.MsgErr(tr("cannot write into file \"")+fn+"\"");
                    return;
                }
                ++completed;
                if(pd.stopped())
                {
                    messages.MsgInf(tr("interrupted"));
                    return;
                }
                pd.incProgress();
            }

            QString query2("select `key`,`key_word`,`key_deriv`,quote(`word`),quote(`cz`),quote(`en`),quote(`gr`),quote(`crum`),`type`,quote(`added`),quote(`updated`),quote(`created_by`),quote(`updated_by`),`pos` from `coptdrv`");
            CMySql q2(query2);

            messages.MsgMsg(tr("executing query '")+query2+"' ...");

            if(!q2.exec())
            {
                messages.MsgErr(q2.lastError());
                return;
            }

            while(q2.next())
            {
                QString l2("insert into `coptdrv` (`key`,`key_word`,`key_deriv`,`word`,`cz`,`en`,`gr`,`crum`,`type`,`added`,`updated`,`created_by`,`updated_by`,`pos`) values ("+
                     q2.value(0)+","+
                     q2.value(1)+","+
                     q2.value(2)+","+
                     q2.value(3)+","+
                     q2.value(4)+","+
                     q2.value(5)+","+
                     q2.value(6)+","+
                     q2.value(7)+","+
                     q2.value(8)+","+
                     q2.value(9)+","+
                     q2.value(10)+","+
                     q2.value(11)+","+
                     q2.value(12)+","+
                     q2.value(13)+")"+CMySql::delimiter
                     );

                if(f.write(l2.toUtf8())==-1)
                {
                    messages.MsgErr(tr("cannot write into file \"")+fn+"\"");
                    return;
                }
                ++completed;
                if(pd.stopped())
                {
                    messages.MsgInf(tr("interrupted"));
                    return;
                }
                pd.incProgress();
            }
            f.close();
            messages.MsgMsg(QString::number(completed)+tr(" lines added."));
            messages.MsgOk();
        }
        else
        {
            messages.MsgErr(tr("cannot open file \"")+fn+"\"");
        }
    }
}

/*void MainWnd::backupCrumUtf8()
{
    QFileDialog fdt(this,"export coptic tables",QDir::toNativeSeparators("data/backup"),"msql files (*.msql);;all files (*)");
    fdt.setAcceptMode(QFileDialog::AcceptSave);
    fdt.setFileMode(QFileDialog::AnyFile);
    fdt.setDefaultSuffix("msql");

    if(fdt.exec())
    {
        QString fn(fdt.selectedFiles().first());

        QFile f(fn);
        if(f.open(QIODevice::WriteOnly))
        {
            CMySql chqF("select count(*) from `coptwrd` union select count(*) from `coptdrv`");
            if(!chqF.exec())
            {
                messages.MsgErr(chqF.lastError());
                return;
            }
            if(!chqF.first())
            {
                messages.MsgErr("something wrong");
                return;
            }
            int maxwrd=chqF.value(0).toInt();
            if(!chqF.next())
            {
                messages.MsgErr("something wrong");
                return;
            }

            int maxdrv=chqF.value(0).toInt(),
                completed=0;

            messages.prepPBar(maxwrd+maxdrv+4);

            QString ts1;
            CMySql sct1("show create table `coptwrd`");
            if(sct1.exec())
            {
                if(sct1.first())
                    ts1=sct1.value(1).trimmed();
                else
                {
                    messages.MsgErr("cannot obtain table structure of `coptwrd`");
                    return;
                }
            }
            else
            {
                messages.MsgErr(sct1.lastError());
                return;
            }

            QString ts2;
            CMySql sct2("show create table `coptdrv`");
            if(sct2.exec())
            {
                if(sct2.first())
                    ts2=sct2.value(1).trimmed();
                else
                {
                    messages.MsgErr("cannot obtain table structure of `coptdrv`");
                    return;
                }
            }
            else
            {
                messages.MsgErr(sct1.lastError());
                return;
            }

            if(
            f.write(QString("drop table if exists `coptwrd`"+CMySql::delimiter).toUtf8())==-1 ||
            f.write(QString(ts1+CMySql::delimiter).toUtf8())==-1 ||
            f.write(QString("drop table if exists `coptdrv`"+CMySql::delimiter).toUtf8())==-1 ||
            f.write(QString(ts2+CMySql::delimiter).toUtf8())==-1
            )
            {
                messages.MsgErr("cannot write into file \""+fn+"\"");
                return;
            }

            sbProgress.setValue(completed+=4);
            messages.repaintMainW();

            QString query("select `key`,`word`,`cz`,`en`,quote(`gr`),quote(`crum`),`type`,`quality`,quote(`added`),quote(`updated`),`created_by`,`updated_by` from `coptwrd`");
            CMySql q(query);

            messages.MsgMsg("executing query \""+query+"\" ...");
            messages.repaintMainW();

            if(!q.exec())
            {
                messages.MsgErr(q.lastError());
                return;
            }

            CWordTemplate wt(true,true,QString(),QString(),QString());
            while(q.next())
            {
                wt.setWord(CCrumResultTree::trBrackets(q.value(1)));
                QString l("insert into `coptwrd` (`key`,`word`,`cz`,`en`,`gr`,`crum`,`type`,`quality`,`added`,`updated`,`created_by`,`updated_by`) values ("+
                          q.value(0)+",quote("+
                     wt.wordTr()+"),quote("+
                     CCrumResultTree::format(q.value(2),true)+"),quote("+
                     CCrumResultTree::format(q.value(3),true)+"),"+
                     q.value(4)+","+
                     q.value(5)+","+
                     q.value(6)+","+
                     q.value(7)+","+
                     q.value(8)+","+
                     q.value(9)+","+
                     q.value(10)+","+
                     q.value(11)+")"+CMySql::delimiter
                     );


                if(f.write(l.toUtf8())==-1)
                {
                    messages.MsgErr("cannot write into file \""+fn+"\"");
                    return;
                }
                ++completed;
                messages.incPBar();
            }

            QString query2("select `key`,`key_word`,`key_deriv`,quote(`word`),quote(`cz`),quote(`en`),quote(`gr`),quote(`crum`),`type`,quote(`added`),quote(`updated`),`created_by`,`updated_by` from `coptdrv`");
            CMySql q2(query2);

            messages.MsgMsg("executing query \""+query2+"\" ...");
            messages.repaintMainW();

            if(!q2.exec())
            {
                messages.MsgErr(q2.lastError());
                return;
            }

            while(q2.next())
            {
                wt.setWord(CCrumResultTree::trBrackets(q2.value(3)));
                QString l2("insert into `coptdrv` (`key`,`key_word`,`key_deriv`,`word`,`cz`,`en`,`gr`,`crum`,`type`,`added`,`updated`,`created_by`,`updated_by`) values ("+
                     q2.value(0)+","+
                     q2.value(1)+","+
                     q2.value(2)+","+
                     wt.wordTr()+",quote("+
                     CCrumResultTree::format(q2.value(4),true)+"),quote("+
                     CCrumResultTree::format(q2.value(5),true)+"),"+
                     q2.value(6)+","+
                     q2.value(7)+","+
                     q2.value(8)+","+
                     q2.value(9)+","+
                     q2.value(10)+","+
                     q2.value(11)+","+
                     q2.value(12)+")"+CMySql::delimiter
                     );

                if(f.write(l2.toUtf8())==-1)
                {
                    messages.MsgErr("cannot write into file \""+fn+"\"");
                    return;
                }
                ++completed;
                messages.incPBar();
            }
            f.close();
            messages.MsgMsg(QString::number(completed)+" lines added.");
            messages.MsgOk();
        }
        else
        {
            messages.MsgErr("cannot open file \""+fn+"\"");
        }
    }
}*/

void MainWnd::on_actionCsv_triggered()
{
    QFileDialog fdt1(this,"export table 1",QDir::toNativeSeparators("data/backup"),"csv files (*.csv);;all files (*)");
    fdt1.setAcceptMode(QFileDialog::AcceptSave);
    fdt1.setFileMode(QFileDialog::AnyFile);
    fdt1.setDefaultSuffix("csv");

    QString t1fn;
    if(fdt1.exec())
    {
        t1fn=fdt1.selectedFiles().first();

        QString query("select * from `coptwrd` into outfile '"+t1fn+"' character set utf8 fields terminated by '#'");

        CMySql t1;
        messages.MsgMsg("exporting table by query "+query);
        if(!t1.exec(query))
        {
            messages.MsgErr(t1.lastError());
            return;
        }

        CMySql sct1("show create table `coptwrd`");
        if(sct1.exec())
        {
            if(sct1.first())
                messages.MsgMsg("TABLE STRUCTURE: \n"+sct1.value(1));
            else
                messages.MsgWarn(tr("cannot obtain table structure"));
        }

        messages.MsgOk();
    }

    QFileDialog fdt2(this,"export table 2",QDir::toNativeSeparators("data/backup"),"csv files (*.csv);;all files (*)");
    fdt2.setAcceptMode(QFileDialog::AcceptSave);
    fdt2.setFileMode(QFileDialog::AnyFile);
    fdt2.setDefaultSuffix("csv");

    QString t2fn;
    if(fdt2.exec())
    {
        t2fn=fdt2.selectedFiles().first();

        QString query2("select * from `coptdrv` into outfile '"+t2fn+"' character set utf8 fields terminated by '#'");

        CMySql t2;
        messages.MsgMsg("exporting table by query "+query2);
        if(!t2.exec(query2))
        {
            messages.MsgErr(t2.lastError());
            return;
        }

        CMySql sct2("show create table `coptdrv`");
        if(sct2.exec())
        {
            if(sct2.first())
                messages.MsgMsg("TABLE STRUCTURE: \n"+sct2.value(1));
            else
                messages.MsgWarn(tr("cannot obtain table structure"));
        }

        messages.MsgInf(tr("files\n\n")+t1fn+"\n"+t2fn+tr("\n\nsaved"));
        messages.MsgOk();


    }
}

void MainWnd::on_actionSql_triggered()
{
    //backupCrumUtf8();
    backupCrum();
}

/*void MainWnd::DBInfo(CMySql::Dbase db)
{
    CMySqlConnection c(&messages);

    QString dbt;
    if(db==CMySql::Local)
        dbt="local";
    else
    {
        dbt="remote";
        if(!c.connect())
            return;
    }

    QString queryN("select (select count(`key`) from `coptwrd`) as `words`,(select count(`key`) from `coptdrv`) as `derivations`,(select count(*) from `crum_index`) as `index`");
    CMySql qN(queryN,db);

    messages.MsgMsg(tr("executing query '")+queryN+"' - "+dbt+" database ...");
    if(!qN.exec())
    {
        messages.MsgErr(qN.lastError());
        if(db==CMySql::Remote)
            c.disconnect();
        return;
    }
    if(!qN.first())
    {
        messages.MsgErr(tr("something wrong"));
        if(db==CMySql::Remote)
            c.disconnect();
        return;
    }

    QString lmsg(dbt+" database:\nwords: "+qN.value(0)+" - derivations: "+qN.value(1)+" - index: "+qN.value(2));
    //messages.MsgMsg(lmsg);
    if(db==CMySql::Remote)
            c.disconnect();
    messages.MsgOk();

    messages.MsgInf(lmsg);
}*/

/*void MainWnd::on_actionInfo_Remote_triggered()
{
    DBInfo(CMySql::Remote);
}*/

/*void MainWnd::on_actionInfo_Local_triggered()
{
    DBInfo(CMySql::Local);
}*/

void MainWnd::on_actionMaps_triggered()
{
    MMaps * mi=new MMaps();
    if(mi)
    {
        mi->show();
        m_sett()->wnds()->addNewWindow(mi);
    }
}


/*void MainWnd::on_actionForce_update_coptic_tables_triggered()
{
    update(CMySql::Remote,CMySql::Local);
    CMySqlConnection(&messages).disconnect();
    messages.MsgOk();
}*/

void MainWnd::copticEditMode(bool newv)
{
    ui->actionNew_word->setEnabled(newv);
    tri.showMessage(tr("edit mode"),QString(tr("edit mode is turned ")+(newv==true?QString(tr("ON\n\nSAVE settings and RESTART Marcion for all features")):QString("OFF"))),QSystemTrayIcon::Information);
}

void MainWnd::on_actionImport_collection_2_triggered()
{
    int i=import("data/backup");
    if(i==-2)
    {
        library.reloadTree();
        messages.MsgInf(tr("All data were successfully imported.\nIf imported data contains collection(s) of texts,\nhighlight it in library window and create index for it\nand make text searchable."));
    }
    else if(i>0)
    {
        library.reloadTree();
        messages.MsgInf(tr("Data were partially imported, error(s) occured.\nIf succesfully imported data contains collection(s) of texts,\nhighlight it in library window and create index for it\nand make text searchable."));
    }
}

void MainWnd::on_actionCreate_index_of_coptic_tables_triggered()
{
    QMessageBox mb( QMessageBox::Question,tr("coptic index"),tr("Deleting old index of coptic tables (if any) and creating new one ...\nContinue ?"), QMessageBox::Ok | QMessageBox::Cancel);

    if(mb.exec()==QMessageBox::Ok)
    {
        CCrumResultTree crt;
        crt.init(&messages);
        crt.createIndex();
    }
}


void MainWnd::on_actionTabfile_triggered()
{
    QFileDialog fdt(this,"stardict tabfile",QDir::toNativeSeparators("data/backup"),"tabfiles (*.tab);;all files (*)");
    fdt.setAcceptMode(QFileDialog::AcceptSave);
    fdt.setFileMode(QFileDialog::AnyFile);
    fdt.setDefaultSuffix("tab");

    if(fdt.exec()==QDialog::Accepted)
    {
        QString query="select `word`,`type`,`crum`,`en` from `coptwrd`";
        CMySql q(query);
        messages.MsgMsg("ececuting query '"+query+"'");
        if(!q.exec())
        {
            messages.MsgErr(q.lastError());
            return;
        }

        QString fn(fdt.selectedFiles().first());
        QFile f(fn);
        messages.MsgMsg(tr("opening file '")+fn+tr("' for writing ..."));
        if(!f.open(QIODevice::WriteOnly))
        {
            messages.MsgErr(tr("cannot open file '")+fn+tr("' for writing"));
            return;
        }

        QRegExp re("<.*>");
        re.setMinimal(true);
        QRegExp re2("\\*\\^.*\\^\\*");
        re2.setMinimal(true);

        CProgressDialog pd;
        pd.show();

        pd.initProgress(tr("backup ..."),q.size());

        while(q.next())
        {
            QString ew(q.value(0)),cr(q.value(2)),cw(CTranslit::getWordType(q.value(1).toShort()));

            ew.remove(re2);
            QString few(ew);
            few.replace("(","!(");
            few=CWordTemplate::formatw(CTranslit::to(few,CTranslit::Copt),false);
            few.remove(re);
            few.replace("!","\\n");


            QStringList w(formatWForTabfile(ew));
            QString m(formatMForTabfile(q.value(3)));
            if(m.isEmpty())
                m="-";

            for(int x=0;x<w.count();x++)
            {
                QString l(w[x]+"\tpage: "+cr+"    class: "+cw+"\\n\\n"+m+"\\n"+few+"\\n\\nThis dictionary is simplified version produced by Marcion.\\nGet full featured version with coptic software at http://sourceforge.net/projects/marcion/files/\n");
                if(f.write(l.toUtf8())==-1)
                {
                    messages.MsgErr("cannot write into file \""+fn+"\"");
                    f.close();
                    return;
                }
            }
            if(pd.stopped())
            {
                messages.MsgInf("interrupted");
                return;
            }
            pd.incProgress();
        }
        f.close();
        messages.MsgOk();
    }
}
QString MainWnd::formatMForTabfile(QString const & str) const
{
    QString r(str);

    QRegExp re("\\[\\[.+\\]\\]");
    re.setMinimal(true);
    int f;
    while((f=re.indexIn(r))!=-1)
    {
        int l=re.matchedLength();
        QString ct(CTranslit::tr(r.mid(f,l).remove("[[").remove("]]"),CTranslit::GreekTrToGreekNcs,false,CTranslit::RemoveNone));
        r.replace(f,l,ct);
    }

    re.setPattern("\\[.+\\]");
    re.setMinimal(true);

    while((f=re.indexIn(r))!=-1)
    {
        int l=re.matchedLength();
        QString ct(CTranslit::tr(r.mid(f,l).remove("[").remove("]"),CTranslit::CopticTrToCopticN,false,CTranslit::RemoveNone));
        r.replace(f,l,ct);
    }



    r.replace("^+",QString(0x2720));
    r.replace("{","").replace("}","");
    r.replace("(","").replace(")","");

    r.replace(" | ","\\n");
    r.replace(" |","\\n");

    r.replace("/*","(").replace("*/",")");
    r.replace("/$","[").replace("$/","]");
    r.replace("$",QString(0x2015));

    return r;
}
QStringList MainWnd::formatWForTabfile(QString const & str) const
{
    QString r(str);

    QRegExp r3("\\*\\^.*\\^\\*");
    r3.setMinimal(true);
    r.remove(r3);
    r.remove("$^");
    r.remove("^$");

    QStringList lw(r.split("(",QString::SkipEmptyParts	)),lw2;


    for(int x=0;x<lw.count();x++)
    {
        QString ow(lw.at(x).trimmed());
        ow.remove(QRegExp("^.*\\)"));
        QStringList lsw(ow.split(",",QString::SkipEmptyParts));
        for(int y=0;y<lsw.count();y++)
        {
            QString ow(lsw[y]);
            ow.remove("*").remove("$").remove("^");
            lw2.append(ow.trimmed());
            lw2.append(CTranslit::to(ow,CTranslit::Copt,false).trimmed());
        }

    }

    return lw2;
}

void MainWnd::on_dwiSettings_visibilityChanged(bool visible)
{
    //ui->actionSettings->setChecked(visible);
    esett.setChecked(visible);
    ui->actionSettings->setChecked(visible);
}

void MainWnd::on_actionAbout_triggered()
{
    CAboutDialog(this).exec();
}

void MainWnd::on_actionDocumentation_online_triggered()
{
    settings.execBrowser(QUrl("http://marcion.sourceforge.net/"));
    /*CMarcBrowser * br=new CMarcBrowser(&messages,"","http://marcion.sourceforge.net/",CMarcBrowser::Remote);
    br->setWindowTitle("Marcion - Home Page");
    QMdiSubWindow *mdiw= ui->mdiArea->addSubWindow(br);
    mdiw->setWindowIcon(QIcon(":/new/icons/icons/web.png"));
    br->show();
    mdiw->setFocus();*/
}

void MainWnd::on_actionOpen_Discussion_forum_triggered()
{
    settings.execBrowser(QUrl("http://sourceforge.net/projects/marcion/forums"));
    /*CMarcBrowser * br=new CMarcBrowser(&messages,"","http://sourceforge.net/projects/marcion/forums/forum/1008435",CMarcBrowser::Remote);
    br->setWindowTitle("Marcion - Open Discussion (forum)");
    QMdiSubWindow *mdiw= ui->mdiArea->addSubWindow(br);
    mdiw->setWindowIcon(QIcon(":/new/icons/icons/web.png"));
    br->show();
    mdiw->setFocus();*/
}

/*void MainWnd::on_actionHelp_forum_triggered()
{
    settings.execBrowser(QUrl("http://sourceforge.net/projects/marcion/forums/forum/1008436"));
    CMarcBrowser * br=new CMarcBrowser(&messages,"","http://sourceforge.net/projects/marcion/forums/forum/1008436",CMarcBrowser::Remote);
    br->setWindowTitle("Marcion - Help (forum)");
    QMdiSubWindow *mdiw= ui->mdiArea->addSubWindow(br);
    mdiw->setWindowIcon(QIcon(":/new/icons/icons/web.png"));
    br->show();
    mdiw->setFocus();
}*/

void MainWnd::on_actionMarcion_Project_Page_triggered()
{
    settings.execBrowser(QUrl("http://sourceforge.net/projects/marcion/"));
    /*CMarcBrowser * br=new CMarcBrowser(&messages,"","http://sourceforge.net/projects/marcion/",CMarcBrowser::Remote);
    br->setWindowTitle("Marcion - project page");
    QMdiSubWindow *mdiw= ui->mdiArea->addSubWindow(br);
    mdiw->setWindowIcon(QIcon(":/new/icons/icons/web.png"));
    br->show();
    mdiw->setFocus();*/
}

void MainWnd::on_actionEnglish_online_triggered()
{
    settings.execBrowser(QUrl("http://marcion.sourceforge.net/docs/"));
}

void MainWnd::on_actionCzech_online_triggered()
{
    settings.execBrowser(QUrl("http://marcion.sourceforge.net/docs/"));
}

/*void MainWnd::on_actionEnglish_guide_local_triggered()
{
    CMarcBrowser * br=new CMarcBrowser(&messages,messages.settings().marcDir,"/doc/doc.html",CMarcBrowser::Local);
    br->setWindowTitle("Marcion guide (english)");
    QMdiSubWindow *mdiw= ui->mdiArea->addSubWindow(br);
    mdiw->setWindowIcon(QIcon(":/new/icons/icons/html_file.png"));
    br->show();
    mdiw->setFocus();
}

void MainWnd::on_actionCzech_guide_local_triggered()
{
    CMarcBrowser * br=new CMarcBrowser(&messages,messages.settings().marcDir,"/doc/doc.html",CMarcBrowser::Local);
    br->setWindowTitle("Marcion guide (czech)");
    QMdiSubWindow *mdiw= ui->mdiArea->addSubWindow(br);
    mdiw->setWindowIcon(QIcon(":/new/icons/icons/html_file.png"));
    br->show();
    mdiw->setFocus();
}*/

void MainWnd::setMainWTitle()
{
    setWindowTitle(nam_ver);
}

void MainWnd::on_actionMarcion_on_Facebook_triggered()
{
    settings.execBrowser(QUrl("http://www.facebook.com/pages/Marcion/166315470058552"));
    /*CMarcBrowser * br=new CMarcBrowser(&messages,"","http://www.facebook.com/pages/Marcion/166315470058552",CMarcBrowser::Remote);
    br->setWindowTitle("Marcion on Facebook");
    QMdiSubWindow *mdiw= ui->mdiArea->addSubWindow(br);
    mdiw->setWindowIcon(QIcon(":/new/icons/icons/web.png"));
    br->show();
    mdiw->setFocus();*/
}

void MainWnd::on_actionFullscreen_triggered()
{
    //ui->actionFullscreen->setChecked(isFullScreen());
    if(ui->actionFullscreen->isChecked())
    {
        showFullScreen();
    }
    else
    {
        showMaximized();
    }
}



void MainWnd::on_actionGlobal_variables_triggered()
{
    showVariables("global");
}

void MainWnd::on_actionSession_variables_triggered()
{
    showVariables("session");
}

void MainWnd::on_actionOpen_triggered()
{
    QFrame * fr=new QFrame();
    QWidget * wdg=new QWidget();
    fr->setFrameShape(QFrame::Box);
    QRadioButton * rbfast=new QRadioButton(tr("silent (faster)")),*rbverb=new QRadioButton(tr("verbose (slower)"));
    QHBoxLayout * lay=new QHBoxLayout();
    QVBoxLayout * lay2=new QVBoxLayout();
    lay->setContentsMargins(9,0,9,0);
    lay->addWidget(rbfast);
    lay->addWidget(rbverb);
    lay->addStretch();
    fr->setLayout(lay);


    rbfast->setChecked(true);

    QFileDialog fd(this,tr("open document"),QDir::toNativeSeparators("data/save"),"*.ilt");
    wdg->setLayout(fd.layout());
    lay2->addWidget(wdg);
    lay2->addWidget(fr);
    fd.setLayout(lay2);
    //fd.layout()->addWidget(&fr);
    fd.setAcceptMode(QFileDialog::AcceptOpen);
    fd.setFileMode(QFileDialog::ExistingFile);
    fd.setDefaultSuffix("ilt");

    if(fd.exec()==QDialog::Accepted)
    {
        if(fd.selectedFiles().count()>0)
        {
            QString filename(fd.selectedFiles().first());
    CTranslat * trwnd=new CTranslat(&messages,filename,rbverb->isChecked());
    //QMdiSubWindow *mdiw= ui->mdiArea->addSubWindow(trwnd);
    //mdiw->setWindowIcon(QIcon(":/new/icons/icons/ilt.png"));
    //mdiw->show();
    trwnd->show();
        }
    }
}

void MainWnd::on_actionNew_triggered()
{
    CTranslat * trwnd=new CTranslat(&messages,QString());
    //QMdiSubWindow *mdiw= ui->mdiArea->addSubWindow(trwnd);
    //mdiw->setWindowIcon(QIcon(":/new/icons/icons/new_ilt.png"));
    //mdiw->show();
    trwnd->show();
}

void MainWnd::on_action_re_create_tables_triggered()
{
    if(QMessageBox(QMessageBox::Question,"truncate tables","all data of coptic translator will be lost.\ncontinue?",QMessageBox::Yes|QMessageBox::No).exec()==QMessageBox::Yes)
    {
        QString query("call drop_copintr()");
        CMySql q(query);
        messages.MsgMsg(tr("executing query '")+query+"' ...");
        if(!q.exec())
        {
          messages.MsgErr(q.lastError());
          return;
        }
        messages.MsgInf("tables truncated");
        messages.MsgOk();
    }
}

void MainWnd::on_actionExamine_data_triggered()
{
    if(!idb)
    {
        idb = new CCopIntTr(&messages);
        idb->setAttribute(Qt::WA_DeleteOnClose,false);
        //idbwnd.setAttribute(Qt::WA_DeleteOnClose,false);
        //idbwnd.setWidget(idb);
        //ui->mdiArea->addSubWindow(&idbwnd);
        idb->setWindowIcon(QIcon(":/new/icons/icons/dbtr.png"));
    }

    idb->show();
    idb->activateWindow();
}

void MainWnd::on_actionBackup_data_triggered()
{
    QStringList tbls;
    tbls << "cop_grp_transl" << "cop_transl" << "cop_encz_transl";

    QString fnames;
    for(int x=0;x<tbls.count();x++)
    {
        QFileDialog fd(this,tr("backup table ")+tbls[x],QDir::toNativeSeparators("data/backup"),"csv files (*.csv);;all files (*)");
        fd.setFileMode(QFileDialog::AnyFile);
        fd.setAcceptMode(QFileDialog::AcceptSave);
        fd.setDefaultSuffix("csv");

        if(fd.exec()==QDialog::Accepted)
        {
            QString fn(fd.selectedFiles().first());
            QString query("select * from `"+tbls[x]+"` into outfile \""+fn+"\" character set utf8 fields terminated by '#'");
            CMySql q;
            messages.MsgMsg(tr("executing query '")+query+"' ...");
            if(!q.exec(query))
            {
                messages.MsgErr(q.lastError());
                return;
            }
            messages.MsgOk();
            fnames.append(fn+"\n");
        }
    }
    if(!fnames.isEmpty())
        messages.MsgInf(tr("files\n\n")+fnames+tr("\n\nsaved"));
}

void MainWnd::on_actionRestore_data_triggered()
{
    QStringList tbls;
    tbls << "cop_grp_transl" << "cop_transl" << "cop_encz_transl";

    QString fnames;
    for(int x=0;x<tbls.count();x++)
    {
        QFileDialog fd(this,tr("restore content of table ")+tbls[x],QDir::toNativeSeparators("data/backup"),"csv files (*.csv);;all files (*)");
        fd.setFileMode(QFileDialog::ExistingFile);
        fd.setAcceptMode(QFileDialog::AcceptOpen);
        fd.setDefaultSuffix("csv");

        if(fd.exec()==QDialog::Accepted)
        {
            QString fn(fd.selectedFiles().first());
            QString query("load data infile \""+fn+"\" into table `"+tbls[x]+"` character set utf8 fields terminated by '#'");
            CMySql q;
            messages.MsgMsg(tr("executing query '")+query+"' ...");
            if(!q.exec(query))
            {
                messages.MsgErr(q.lastError());
                return;
            }
            messages.MsgOk();
            fnames.append(fn+"\n");
        }

        if(!fnames.isEmpty())
            messages.MsgInf(tr("files\n\n")+fnames+tr("\n\nloaded"));
    }
}

void MainWnd::on_action_re_create_tables_2_triggered()
{
    if(QMessageBox(QMessageBox::Question,tr("(re)create tables"),tr("All data of coptic translator will be lost.\nContinue?"),QMessageBox::Yes|QMessageBox::No).exec()==QMessageBox::Yes)
    {
        QStringList tbls;
        tbls << "drop table if exists `cop_grp_transl`,`cop_transl`,`cop_encz_transl`"
                << "CREATE TABLE `cop_grp_transl` (  `key` int(11) NOT NULL AUTO_INCREMENT,  `name` char(50) COLLATE utf8_bin NOT NULL,  `crum_table` tinyint(4) DEFAULT NULL,  `crum_id` int(11) DEFAULT NULL,  `grammar` char(10) COLLATE utf8_bin DEFAULT NULL,  PRIMARY KEY (`key`),  UNIQUE KEY `iname` (`name`(10)),  KEY `icrum` (`crum_id`)) ENGINE=MyISAM AUTO_INCREMENT=0 DEFAULT CHARSET=utf8 COLLATE=utf8_bin"
                << "CREATE TABLE `cop_transl` (  `key` int(11) NOT NULL AUTO_INCREMENT,  `word` char(15) COLLATE utf8_bin NOT NULL,  `key_group` int(11) NOT NULL,  PRIMARY KEY (`key`),  KEY `ikey_group` (`key_group`),  KEY `iword` (`word`(10))) ENGINE=MyISAM AUTO_INCREMENT=0 DEFAULT CHARSET=utf8 COLLATE=utf8_bin"
                << "CREATE TABLE `cop_encz_transl` (  `key` int(11) NOT NULL AUTO_INCREMENT,  `en_eqv` char(30) CHARACTER SET utf8 NOT NULL,  `cz_eqv` char(30) CHARACTER SET utf8 NOT NULL,  `key_group` int(11) NOT NULL,  PRIMARY KEY (`key`),  KEY `ien_eqv` (`en_eqv`(10)),  KEY `icz_eqv` (`cz_eqv`(10)),  KEY `ikey_group` (`key_group`)) ENGINE=MyISAM AUTO_INCREMENT=0 DEFAULT CHARSET=utf8 COLLATE=utf8_bin";
                /*<< "CREATE DEFINER=`marcion`@`localhost` trigger `idup_grp_key` before insert on `cop_grp_transl`for each row begin    declare ct tinyint default new.`crum_table`;    case    when ct in(1,2) then        if not (select count(*) from cop_grp_transl where `crum_table`=ct and `crum_id`=new.`crum_id`)=0 then            call error_id_exist();        end if;    when ct=3 then        set new.`crum_id`=null;    when ct is null then        set new.`crum_id`=null;        set new.`grammar`=null;    end case;end"
                <<
                "CREATE DEFINER=`marcion`@`localhost` trigger `udup_grp_key` before update on `cop_grp_transl`for each row begin    declare ct tinyint default new.`crum_table`;    case    when ct in(1,2) then        if not (select count(*) from cop_grp_transl where `crum_table`=ct and `crum_id`=new.`crum_id` and not `key`=old.`key`)=0 then            call error_id_exist();        end if;    when ct=3 then        set new.`crum_id`=null;    when ct is null then        set new.`crum_id`=null;        set new.`grammar`=null;    end case;end";*/

        for(int x=0;x<tbls.count();x++)
        {
            QString query(tbls[x]);
            CMySql q(query);
            messages.MsgMsg(tr("executing query '")+query+"' ...");
            if(!q.exec())
            {
              messages.MsgErr(q.lastError());
              return;
            }

            messages.MsgOk();
        }
        messages.MsgInf("tables created");
    }
}

void MainWnd::on_actionCreate_html_data_triggered()
{
    QString qtrunc("truncate table `crum_html`");
    CMySql qt(qtrunc);
    messages.MsgMsg(tr("executing query '")+qtrunc+"' ...");
    if(!qt.exec())
    {
      messages.MsgErr(qt.lastError());
      return;
    }

    QString query("select `key`,`word`,`en`,`cz`,`crum`,`type`,`quality` from `coptwrd`"),
        queryd("select `key`,`word`,`en`,`cz`,`crum`,`type` from `coptdrv`");

    CMySql q(query);
    messages.MsgMsg(tr("executing query '")+query+"' ...");
    if(!q.exec())
    {
      messages.MsgErr(q.lastError());
      return;
    }
    CMySql qd(queryd);
    messages.MsgMsg(tr("executing query '")+queryd+"' ...");
    if(!qd.exec())
    {
      messages.MsgErr(qd.lastError());
      return;
    }

    CProgressDialog pd;
    pd.show();
    pd.initProgress("coptic - creating code ...",q.size()+qd.size());

    while(q.next())
    {
        CWordTemplate wt(false,false,messages.settings().border(),messages.settings().padding(),messages.settings().spacing());

        QString key(q.value(0));
        QString crum(q.value(4)),crumpg(QString(crum).remove(QRegExp("[^0-9]")));

        wt.setKey(key);
        wt.setWordKey("");
        wt.setType(q.value(5).toShort());
        wt.setCrum(crum,QString());
        wt.setQuality(q.value(6).toShort());
        wt.setWord(CCrumResultTree::trBrackets(q.value(1)));
        //wt.setCzech(CCrumResultTree::format(ri->cz,cbGrEqv->isChecked()));
        wt.setEnglish(CCrumResultTree::format(q.value(2),true));
        wt.setGreek("");
        //wt.setTable("w");

        wt.setCreatedAt("");
        wt.setUpdatedAt("");
        wt.setCreatedBy("");
        wt.setUpdatedBy("");

        QString query2("insert into `crum_html` (`word_key`,`table`,`wd`) values (");
        query2.append(key+",'");
        query2.append(wt.create(CWordTemplate::Html,false).replace("'","\\'").replace("(*crumlinkapp*)",crumpg)+"',1)");

        CMySql q2(query2);
        if(!q2.exec())
        {
          messages.MsgMsg(query2);
          messages.MsgErr(q2.lastError());
          return;
        }

        if(pd.stopped())
            return;

        pd.incProgress();
    }

    while(qd.next())
    {
        CWordTemplate wt(false,false,messages.settings().border(),messages.settings().padding(),messages.settings().spacing());

        QString key(qd.value(0));
        QString crum(qd.value(4)),crumpg(QString(crum).remove(QRegExp("[^0-9]")));

        wt.setKey(key);
        wt.setWordKey("");
        wt.setType(qd.value(5).toShort());
        wt.setCrum(qd.value(4),QString());
        wt.setNoQuality();
        wt.setWord(CCrumResultTree::trBrackets(qd.value(1)));
        //wt.setCzech(CCrumResultTree::format(ri->cz,cbGrEqv->isChecked()));
        wt.setEnglish(CCrumResultTree::format(qd.value(2),true));
        wt.setGreek("");
        //wt.setTable("w");

        wt.setCreatedAt("");
        wt.setUpdatedAt("");
        wt.setCreatedBy("");
        wt.setUpdatedBy("");

        QString query2("insert into `crum_html` (`word_key`,`table`,`wd`) values (");
        query2.append(key+",'");
        query2.append(wt.create(CWordTemplate::Html,false).replace("'","\\'").replace("(*crumlinkapp*)",crumpg)+"',2)");

        CMySql q2(query2);
        if(!q2.exec())
        {
          messages.MsgMsg(query2);
          messages.MsgErr(q2.lastError());
          return;
        }

        if(pd.stopped())
            return;

        pd.incProgress();
    }

    /*QString qtrunc2("truncate table `lsj_html`");
    CMySql qt2(qtrunc2);
    messages.MsgMsg("executing query \""+qtrunc2+"\" ...");
    if(!qt2.exec())
    {
      messages.MsgErr(qt2.lastError());
      return;
    }

    QString querylsj("select `word_utf8`,`sense` from `lsj_senses`");
    CMySql qlsj(querylsj);
    messages.MsgMsg("executing query \""+querylsj+"\" ...");
    if(!qlsj.exec())
    {
      messages.MsgErr(qlsj.lastError());
      return;
    }

    pd.setProgress(0);
    pd.initProgress("greek - creating code ...",qlsj.size());


    while(qlsj.next())
    {
        QString queryinslsj("insert into `lsj_html` (`word`,`table`) values ('<word>','<table>')");
        QString t(CLSJ::prepare_sense(qlsj.value(1)));
        t.replace("'","\\'");
        //t.replace("\n","<br>");

        queryinslsj.replace("<word>",CTranslit::tr(qlsj.value(0),CTranslit::GreekNToGreekTr,true,false));
        queryinslsj.replace("<table>",t);

        CMySql q(queryinslsj);
        if(!q.exec())
        {
          messages.MsgMsg(queryinslsj);
          messages.MsgErr(q.lastError());
          return;
        }
        if(pd.stopped())
            return;

        pd.incProgress();
    }*/

    messages.MsgOk();
}

void MainWnd::settings_scan_lang_toggled(bool value)
{
    QCheckBox * sender=(QCheckBox*)this->sender();
    if(sender==settings.scCop())
    {
        a_coptic->setChecked(value);
        tri.showMessage(tr("clipboard scanning"),tr("COPTIC language scanning: ")+(m_sett()->scanCop()?tr("ON"):tr("OFF")),QSystemTrayIcon::Information);
    }
    else if(sender==settings.scGk())
    {
        a_greek->setChecked(value);
        tri.showMessage(tr("clipboard scanning"),tr("GREEK language scanning: ")+(m_sett()->scanGk()?tr("ON"):tr("OFF")),QSystemTrayIcon::Information);
    }
    else if(sender==settings.scLat())
    {
        a_latin->setChecked(value);
        tri.showMessage(tr("clipboard scanning"),tr("LATIN language scanning: ")+(m_sett()->scanLat()?tr("ON"):tr("OFF")),QSystemTrayIcon::Information);
    }
    else return;
}

void MainWnd::settings_scan_toggled(bool value)
{
    a_tri_clip->setChecked(value);
    tri_lang_menu.setEnabled(value);
    a_coptic->setChecked(settings.scanCop());
    a_greek->setChecked(settings.scanGk());
    a_latin->setChecked(settings.scanLat());
    if(value)
    {
        connect(QApplication::clipboard(),SIGNAL(dataChanged()),this,SLOT(app_clipboard_textChanged()));
        tri.showMessage(tr("clipboard scanning"),tr("scanning of clipboard ENABLED\n\nGreek: ")+(m_sett()->scanGk()?tr("YES"):tr("NO"))+tr("\nLatin: ")+(m_sett()->scanLat()?tr("YES"):tr("NO"))+tr("\nCoptic: ")+(m_sett()->scanCop()?tr("YES"):tr("NO")),QSystemTrayIcon::Information);
        sbILabel.setText(tr("clipboard scanning ENABLED"));
        messages.MsgMsg(tr("clipboard scanning enabled"));
    }
    else
    {
        disconnect(QApplication::clipboard(),SIGNAL(dataChanged()),this,SLOT(app_clipboard_textChanged()));
        tri.showMessage(tr("clipboard scanning"),tr("scanning of clipboard DISABLED"),QSystemTrayIcon::Information);
        sbILabel.setText(tr("clipboard scanning DISABLED"));
        messages.MsgMsg(tr("clipboard scanning disabled"));
    }
}

void MainWnd::app_clipboard_textChanged()
{
    QString txt(QApplication::clipboard()->text());
    txt=txt.left(99);
    messages.MsgMsg(tr("from clipboard: ")+txt);

    CTranslit::Script lang=CTranslit::identify(txt);
    if(lang==CTranslit::Copt&&m_sett()->scanCop())
    {
        QString word(CTranslit::tr(txt,CTranslit::CopticNToCopticTr,true,CTranslit::RemoveAll));
        if(!wpr)
        {
            wpr=new CWordPreview(&messages,0);
            wpr->setWindowIcon(QIcon(":/new/icons/icons/main.png"));

            wpr->setWindowFlags(Qt::Window);
            wpr->setAttribute(Qt::WA_DeleteOnClose,false);
            //wlsj->setWindowFlags(Qt::WindowTitleHint|Qt::WindowStaysOnTopHint);
            wpr->setWindowFlags(Qt::WindowStaysOnTopHint);
            //wlsj->setWindowState(Qt::WindowNoState);
            wpr->setWindowTitle(tr("Coptic dictionary | ")+word);
            wpr->adjustSize();
        }

        wpr->hide();
        wpr->queryCoptic(word);
        wpr->move(QCursor::pos());
        wpr->showNormal();

        //wpr->activateWindow();

    }
    else if(lang==CTranslit::Greek||lang==CTranslit::Latin)
    {
        QString word;
        if(lang==CTranslit::Greek)
        {
            if(!m_sett()->scanGk())
                return;
            word=CTranslit::tr(txt,CTranslit::GreekNToGreekTr,true,CTranslit::RemoveAll);
        }
        else
        {
            if(!m_sett()->scanLat())
                return;
            word=CTranslit::tr(txt,CTranslit::LatinNToLatinTr,true,CTranslit::RemoveAll);
        }
        if(!wlsj)
        {
            wlsj=new CLSJ(&messages,0);
            wlsj->setWindowIcon(QIcon(":/new/icons/icons/main.png"));

            wlsj->setWindowFlags(Qt::Window);
            wlsj->setAttribute(Qt::WA_DeleteOnClose,false);
            //wlsj->setWindowFlags(Qt::WindowTitleHint|Qt::WindowStaysOnTopHint);
            wlsj->setWindowFlags(Qt::WindowStaysOnTopHint);
            //wlsj->setWindowState(Qt::WindowNoState);
            wlsj->setWindowTitle(tr("Gr/Lat dictionary | ")+word);
            wlsj->adjustSize();

        }

        wlsj->hide();
        wlsj->prepareParse(word,lang==CTranslit::Greek);
        wlsj->parse(lang==CTranslit::Greek);

        wlsj->move(QCursor::pos());

        //wlsj->show();
        wlsj->showNormal();
        //wlsj->activateWindow();
        //wlsj->raise();

    }
}

void MainWnd::settings_tray_toggled(bool value)
{
    if(value)
    {
        tri.show();
        messages.MsgMsg(tr("tray icon enabled"));
    }
    else
    {
        tri.hide();
        messages.MsgMsg(tr("tray icon disabled"));
    }
}

void MainWnd::initTrayMenu()
{
    a_coptic=tri_lang_menu.addAction(tr("&Coptic"));
    a_coptic->setCheckable(true);
    a_coptic->setChecked(settings.scanCop());
    a_greek=tri_lang_menu.addAction(tr("&Greek"));
    a_greek->setCheckable(true);
    a_greek->setChecked(settings.scanGk());
    a_latin=tri_lang_menu.addAction(tr("&Latin"));
    a_latin->setCheckable(true);
    a_latin->setChecked(settings.scanLat());

    a_activate=tri_menu.addAction(QIcon(":/new/icons/icons/action.png"),tr("a&ctivate"));
    tri_menu.addMenu(&tri_wnds_menu);
    tri_menu.addSeparator();
    a_tri_home=tri_menu.addAction(QIcon(":/new/icons/icons/web.png"),tr("Marcion's &Home Page"));
    a_tri_fb=tri_menu.addAction(QIcon(":/new/icons/icons/web.png"),tr("Marcion on &Facebook"));
    a_tri_about=tri_menu.addAction(QIcon(":/new/icons/icons/info.png"),tr("&about Marcion"));
    tri_menu.addSeparator();
    a_tri_max=tri_menu.addAction(tr("ma&ximize"));
    a_tri_min=tri_menu.addAction(tr("&minimize"));
    a_tri_norm=tri_menu.addAction(tr("&normal"));
    a_tri_full=tri_menu.addAction(tr("f&ullscreen"));
    a_tri_full->setShortcut(QKeySequence("F12"));
    tri_menu.addSeparator();
    (a_tri_clip=tri_menu.addAction(tr("&scan clipboard")))->setCheckable(true);
    tri_menu.addMenu(&tri_lang_menu);
    tri_menu.addSeparator();
    a_tri_sett=tri_menu.addAction(QIcon(":/new/icons/icons/settings.png"),tr("s&ettings"));
    a_tri_sett->setShortcut(QKeySequence("F4"));
    a_tri_hide=tri_menu.addAction(tr("hi&de this icon"));
    tri_menu.addSeparator();
    a_tri_quit=tri_menu.addAction(QIcon(":/new/icons/icons/exit.png"),tr("&quit"));
    a_tri_quit->setShortcut(QKeySequence("Ctrl+Q"));

}

void MainWnd::slot_trayMenuLangTriggered(QAction * action)
{
    if(action)
    {
        if(action==a_coptic)
        {
             settings.scCop()->setChecked(a_coptic->isChecked());
        }
        else if(action==a_greek)
        {
             settings.scGk()->setChecked(a_greek->isChecked());
        }
        else if(action==a_latin)
        {
             settings.scLat()->setChecked(a_latin->isChecked());
        }
    }
}

void MainWnd::slot_trayMenuTriggered(QAction * action)
{
    if(action)
    {
        if(action==a_tri_fb)
        {
            settings.execBrowser(QUrl("http://www.facebook.com/pages/Marcion/166315470058552"));
        }
        else if(action==a_activate)
        {
            activateWindow();
        }
        else if(action==a_tri_home)
        {
            settings.execBrowser(QUrl("http://marcion.sourceforge.net/"));
        }
        else if(action==a_tri_max)
        {
            activateWindow();
             showMaximized();
        }
        else if(action==a_tri_min)
        {
            activateWindow();
             showMinimized();
        }
        else if(action==a_tri_norm)
        {
            activateWindow();
             showNormal();
        }
        else if(action==a_tri_full)
        {
            activateWindow();
            ui->actionFullscreen->setChecked(true);
             showFullScreen();
        }
        else if(action==a_tri_clip)
        {
             settings.sc()->setChecked(a_tri_clip->isChecked());
        }
        else if(action==a_tri_hide)
        {
             settings.tray()->setChecked(false);
        }
        else if(action==a_tri_about)
        {
            activateWindow();
             on_actionAbout_triggered();
        }
        else if(action==a_tri_sett)
        {
            ui->actionSettings->setChecked(true);
            activateWindow();
            ui->dwiSettings->show();
        }
        else if(action==a_tri_quit)
        {
            activateWindow();
             on_actionQuit_triggered();
        }
    }
}

void MainWnd::slot_bookMenuTriggered(QAction * action)
{
    if(action)
    {
        MWndAction * wa((MWndAction *)action);
        MWindowsWidget::activateOne(wa->_wdg);
    }
}

void MainWnd::slot_trayIconActivated(QSystemTrayIcon::ActivationReason reason)
{
   switch(reason)
   {
   case QSystemTrayIcon::Trigger :
   case QSystemTrayIcon::DoubleClick :
   case QSystemTrayIcon::MiddleClick :
           activateWindow();
       break;
   default :
           break;
   }
}

void MainWnd::closeEvent(QCloseEvent * event)
{
    QMessageBox mb(QMessageBox::Question,"Marcion",tr("Exit Marcion?"),QMessageBox::Yes|QMessageBox::No,this);
    if(mb.exec()==QMessageBox::Yes)
    {
        preventClose()=false;
        QApplication::closeAllWindows();

        if(preventClose())
            event->ignore();
        else
            event->accept();
    }
    else
        event->ignore();
}

void MainWnd::slot_settingsChanged(int change)
{
    switch(change)
    {
    case CSettings::AppFont :
        tri.showMessage(tr("application font"),tr("application font changed\n\nSAVE settings and RESTART Marcion for effect"),QSystemTrayIcon::Information);
        break;
    default :
            break;
    }
}

void MainWnd::initToolBar()
{
    ui->tbarILT->addAction(QIcon(":/new/icons/icons/new_ilt.png"),tr("new file"),this,SLOT(on_actionNew_triggered()));
    ui->tbarILT->addAction(QIcon(":/new/icons/icons/ilt.png"),tr("open file"),this,SLOT(on_actionOpen_triggered()));
    ui->tbarILT->addAction(QIcon(":/new/icons/icons/dbtr.png"),tr("ILT database"),this,SLOT(on_actionExamine_data_triggered()));

    tbrDict=new QToolBar(tr("dictionary"),0);
    tbrDict->setObjectName("tbrDict");
    tbrDict->addAction(QIcon(":/new/icons/icons/alfa1.png"),tr("Coptic dictionary (printed)"),this,SLOT(on_actionCrum_triggered()));
    tbrDict->addAction(QIcon(":/new/icons/icons/gima.png"),tr("Coptic dictionary (search)"),this,SLOT(on_actionQuery_triggered()));
    tbrDict->addAction(QIcon(":/new/icons/icons/alfa2.png"),tr("Greek/Latin dictionary"),this,SLOT(on_actionQuery_LSJ_triggered()));
    tbrDict->addAction(QIcon(":/new/icons/icons/abgd.png"),tr("Hebrew dictionary"),this,SLOT(on_action_Hebrew_triggered()));
    tbrDict->addSeparator();
    tbrDict->addAction(QIcon(":/new/icons/icons/plumley.png"),tr("Coptic grammar (Plumley)"),this,SLOT(on_actionPlumley_triggered()));
    tbrDict->addAction(QIcon(":/new/icons/icons/tattam.png"),tr("Coptic grammar (Tattam)"),this,SLOT(on_actionTattam_triggered()));
    tbrDict->addAction(QIcon(":/new/icons/icons/lg.png"),tr("Latin grammar (Bennett)"),this,SLOT(on_actionBennett_Latin_grammar_triggered()));
    tbrDict->addAction(QIcon(":/new/icons/icons/numcnv.png"),tr("numeric converter"),this,SLOT(on_actionCoptic_numerals_triggered()));
    insertToolBar(ui->tbarILT,tbrDict);

    tbrLib=new QToolBar(tr("library"),0);
    tbrLib->setObjectName("tbrLib");
    ta_lib=tbrLib->addAction(QIcon(":/new/icons/icons/books.png"),tr("view library"),this,SLOT(on_actionView_library_triggered()));
    ta_lib->setCheckable(true);
    ta_libsrch=tbrLib->addAction(QIcon(":/new/icons/icons/loupe.png"),tr("search in library"),this,SLOT(on_actionSearch_library_triggered()));
    ta_libsrch->setCheckable(true);
    tbrLib->addAction(QIcon(":/new/icons/icons/book.png"),tr("open book"),this,SLOT(on_actionOpen_book_triggered()));
    tbrLib->addAction(QIcon(":/new/icons/icons/impcoll.png"),tr("import collection"),this,SLOT(on_actionImport_collection_2_triggered()));
    tbrLib->addAction(QIcon(":/new/icons/icons/downweb.png"),tr("download web"),this,SLOT(on_actionDownload_web_triggered()));
    tbrLib->addAction(QIcon(":/new/icons/icons/folderwork.png"),tr("index directory"),this,SLOT(on_actionIndex_directory_triggered()));
    insertToolBar(ui->tbarILT,tbrLib);
}

void MainWnd::saveWState()
{
    messages.MsgMsg(tr("saving state ..."));
    QByteArray d=saveState(182);
    QFile f(settings.marcDir+QDir::separator()+"restore.cfg");
    if(f.open(QIODevice::WriteOnly))
    {
        int e=f.write(d);
        f.close();
        if(e!=-1)
            messages.MsgOk();
        else
            messages.MsgMsg(tr("write failed"));
    }
    else
        messages.MsgMsg(tr("failed"));
}

void MainWnd::restoreWState()
{
    messages.MsgMsg(tr("restoring state ..."));
    QFile f(settings.marcDir+QDir::separator()+"restore.cfg");
    if(f.open(QIODevice::ReadOnly))
    {
        QByteArray d=f.readAll();
        f.close();
        restoreState(d,182);
        messages.MsgOk();
    }
    else
        messages.MsgMsg(tr("file '")+f.fileName()+tr("' cannot be opened"));
}

void MainWnd::storeRecentFiles() const
{
    CSettings::recentFiles.deleteMenu();
    if(CSettings::recentFiles.count()>0)
    {
        m_msg()->MsgMsg(tr("saving info about recent files ..."));
        QString query("truncate table `marc_recent_files`"),query2("insert into `marc_recent_files` (`filename`,`book`,`chapter`,`verse`,`script`,`type`) values ");
        MQUERY(q,query)


        for(int x=0;x<CSettings::recentFiles.count();x++)
        {
            if(x>14) break;
            MFileItem const * item(&CSettings::recentFiles.at(x));
            query2.append("('"+item->_filename+"',");
            query2.append(QString::number(item->_book)+",");
            query2.append(QString::number(item->_chapter)+",");
            query2.append(QString::number(item->_verse)+",");
            query2.append(QString::number(item->_script)+",");
            query2.append(QString::number(item->_type)+"),");
        }
        query2.chop(1);
        MQUERY(q2,query2)
        m_msg()->MsgOk();
    }
}

void MainWnd::loadRecentFiles()
{
    m_msg()->MsgMsg(tr("restoring info of recent files ..."));
    QString query("select `filename`,`book`,`chapter`,`verse`,`script`,`type` from `marc_recent_files`");
    MQUERY(q,query)

    while(q.next())
    {
        MFileItem i(q.value(0),q.value(1).toUInt(),q.value(2).toUInt(),q.value(3).toUInt(),q.value(4).toUInt());
        i._type=(MFileItem::Type)q.value(5).toInt();
        CSettings::recentFiles.prependFileItem(i,true);
    }
    CSettings::recentFiles.initMenu();
    connect(CSettings::recentFiles.popupMenu(),
            SIGNAL(aboutToShow()),this,SLOT(slot_recFilesMenu_aboutToShow()));
    ui->menuDictionary->insertMenu(ui->actionSettings,CSettings::recentFiles.popupMenu());
    m_msg()->MsgOk();
}

void MainWnd::slot_recFilesMenu_aboutToShow()
{
    CSettings::recentFiles.buildMenu(this,SLOT(slot_recFileItemToggled()),SLOT(slot_recFileItemClear()));
}

void MainWnd::slot_mnuBooks_aboutToShow()
{
    opened_books.buildList(&tri_wnds_menu);
}

void MainWnd::slot_mnuViewBooks_aboutToShow()
{
    opened_books.buildList(&wnds_menu);
}

void MainWnd::slot_recFileItemToggled()
{
    QAction * a=(QAction*)this->sender();
    int index=a->data().toInt();
    if(index>=0&&index<CSettings::recentFiles.count())
    {
        MFileItem const * item(&CSettings::recentFiles.at(index));
        switch(item->_type)
        {
        case MFileItem::MySql :
            library.openMysqlBook((int)item->_book,
                                  (int)item->_chapter,
                                  (int)item->_verse,
                                  (int)item->_script);
            break;
        case MFileItem::Html :
            library.openHtmlBook(&messages,
                             item->_filename,
                             CLibraryWidget::Auto);
            break;
        }
    }
}

void MainWnd::slot_recFileItemClear()
{
    QString query("truncate table `marc_recent_files`");
    MQUERY(q,query)

    m_sett()->recentFiles.clear();
    m_msg()->MsgOk();
}

void MainWnd::on_menuView_aboutToShow()
{
    ui->actionFullscreen->setChecked(isFullScreen());
    ui->actionLibrary->setChecked(ui->dockLibrary->isVisible());
    ui->actionSearch->setChecked(ui->dockSearchLibrary->isVisible());
    ui->actionMessages->setChecked(ui->dwiMsg->isVisible());
    ui->actionSettings_2->setChecked(ui->dwiSettings->isVisible());
    ui->actionOpened_books->setChecked(ui->dwiBooks->isVisible());
    ui->actionILT->setChecked(ui->tbarILT->isVisible());
    ui->actionDictionaries->setChecked(tbrDict->isVisible());
    ui->actionLibrary_2->setChecked(tbrLib->isVisible());
}

void MainWnd::on_actionDictionaries_triggered(bool checked)
{
    tbrDict->setVisible(checked);
}

void MainWnd::on_actionILT_triggered(bool checked)
{
    ui->tbarILT->setVisible(checked);
}

void MainWnd::on_actionLibrary_triggered(bool checked)
{
    ui->dockLibrary->setVisible(checked);
}

void MainWnd::on_actionSearch_triggered(bool checked)
{
    ui->dockSearchLibrary->setVisible(checked);
}

void MainWnd::on_actionOpened_books_2_triggered(bool checked)
{
    ui->dwiBooks->setVisible(checked);
}

void MainWnd::on_actionMessages_triggered(bool checked)
{
    ui->dwiMsg->setVisible(checked);
}

void MainWnd::on_actionSettings_2_triggered(bool checked)
{
    ui->dwiSettings->setVisible(checked);
}

void MainWnd::on_actionOpened_books_triggered(bool checked)
{
    ui->dwiBooks->setVisible(checked);
}

void MainWnd::on_actionLibrary_2_triggered(bool checked)
{
    tbrLib->setVisible(checked);
}

void MainWnd::on_actionDownload_web_triggered()
{
    MDownloadWeb * dw= new MDownloadWeb(&messages,QDir("library"),library);
    dw->show();
    /*if(library.findHtmlItem(dw.targetDir()))
    {
        library.tabLibrary->setCurrentIndex(1);
        ui->dockLibrary->show();
    }*/
    /*else
        messages.MsgWarn("Target directory is placed outside of Marcion's html 'library' directory.");*/
}

/*void MainWnd::on_mdiArea_customContextMenuRequested(QPoint )
{
    ui->menuItems->exec(QCursor::pos());
}*/

void MainWnd::on_actionMinimize_triggered()
{
    showMinimized();
}

void MainWnd::on_actionMaximize_triggered()
{
    showMaximized();
}

void MainWnd::on_actionExecute_SQL_triggered()
{
    MExecSql * m(new MExecSql(&messages));
    m->showNormal();
}

void MainWnd::on_dockLibrary_visibilityChanged(bool visible)
{
    ui->actionView_library->setChecked(visible);
    if(ta_lib)
        ta_lib->setChecked(visible);
}

void MainWnd::on_dockSearchLibrary_visibilityChanged(bool visible)
{
    ui->actionSearch_library->setChecked(visible);
    if(ta_libsrch)
        ta_libsrch->setChecked(visible);
}

void MainWnd::on_dwiBooks_visibilityChanged(bool visible)
{
    ui->actionOpened_books_2->setChecked(visible);
}

void MainWnd::slot_resizeIcons(bool toolbars)
{
    if(toolbars)
        setIconSize(settings.iconsSize(toolbars));
    else
    {
        settings.setIcSizes(msgTitle);
        settings.setIcSizes(messages);
        settings.setIcSizes(settTitle);
        settings.setIcSizes(settings);
        settings.setIcSizes(libTitle);
        settings.setIcSizes(library);
        settings.setIcSizes(libSTitle);
        settings.setIcSizes(library_search);
        settings.setIcSizes(library_search.dialog());
        settings.setIcSizes(*this);
    }
}

void MainWnd::slot_msgTitleRequest(int request)
{
    switch(request)
    {
    case MMsgTitle::Hide :
        ui->dwiMsg->hide();
        break;
    case MMsgTitle::Top :
        messages.goToTop();
        break;
    case MMsgTitle::Bottom :
        messages.goToBottom();
        break;
    case MMsgTitle::Clear :
        messages.clear();
        break;
    case MMsgTitle::Help :
        messages.printHelp();
        break;
    case MMsgTitle::Version :
        messages.printVersion();
        break;
    }
}

void MainWnd::slot_libSTitle_hide()
{
    ui->dockSearchLibrary->hide();
}

void MainWnd::on_actionIndex_directory_triggered()
{
    MIndexDir2 * w=new MIndexDir2(&messages,QDir("library"),library);
    w->show();
}

void MainWnd::on_action_re_create_index_of_TLG_PHI_triggered()
{
    messages.MsgInf(tr("not yet finished"));
}

void MainWnd::on_actionSupported_image_formats_triggered()
{
    QString s(tr("<ul><lh>supported image formats</lh>"));
    for(int x=0;x<settings.imageFormats().count();x++)
        s.append("<li>"+settings.imageFormats().at(x)+"</li>");
    s.append("</ul>");

    messages.appendHtml(s);
    messages.activateMessages();
}

void MainWnd::on_actionDrop_entire_archive_triggered()
{
    MDropArchive d;
    if(d.exec()==QDialog::Accepted)
    {
        USE_CLEAN_WAIT
        QString query("call drop_archive("+d.dropAuthors(true)+","+d.dropCategories(true)+")");
        MQUERY(q,query)

        m_msg()->MsgInf(tr("archive was deleted\n\nincluding categories: ")+d.dropCategories(false)+tr("\nincluding authors: ")+d.dropAuthors(false));
        m_msg()->MsgOk();
        _archW.readCategories(true);
    }
}

void MainWnd::on_actionManage_archive_triggered()
{
    _archW.manageArchive();
}

void MainWnd::on_actionDrop_mysql_library_triggered()
{
    library.dropEntireLibrary();
}

void MainWnd::slot_fileOpenRequest(QString filename)
{
    m_msg()->MsgMsg(tr("TCP server: request to file open '")+filename+"'",true);
    tri.showMessage(tr("TCP server: request to file open"),filename);
    library.openHtmlBook(&messages,filename,CLibraryWidget::Auto);
    //activateWindow();
}

void MainWnd::slot_tcpServerStopped()
{
    m_msg()->MsgMsg(tr("TCP server: stopped (request from another instance of Marcion)"));
    tri.showMessage(tr("TCP server"),tr("stopped (request from another instance of Marcion)"));
    wdgTcp.checkServer();
}

void MainWnd::on_actionCoptic_numerals_triggered()
{
    MCopticNumerals * cnum=new MCopticNumerals();
    if(cnum)
        cnum->show();
}

void MainWnd::keyPressEvent(QKeyEvent * event)
{
    event->ignore();
    if(event->modifiers()==0)
        switch(event->key())
        {
        case Qt::Key_F5 :
            event->accept();
            ui->dockLibrary->show();
            library.activateLibType(0);
            break;
        case Qt::Key_F6 :
            event->accept();
            ui->dockLibrary->show();
            library.activateLibType(1);
            break;
        case Qt::Key_F7 :
            event->accept();
            ui->dockLibrary->show();
            library.activateLibType(2);
            break;
        case Qt::Key_F8 :
            event->accept();
            //ui->dockLibrary->show();
            //library.activateLibType(3);
            ui->tabMainApp->setCurrentIndex(MTIDX_ARCH);
            _archW.setFocus();
            break;
        default:
            break;
        }

    if(!event->isAccepted())
        QMainWindow::keyPressEvent(event);
}

void MainWnd::on_actionImport_coptic_dictionary_triggered()
{
    int i=import("data/backup");
    if(i==-2)
    {
        QMessageBox mb(QMessageBox::Information,tr("import coptic dictionary data"),tr("Data were succesfully imported. Rebuild index now? (recommended, it is necessary for search in the dictionary)"),QMessageBox::Yes|QMessageBox::No,this);
        if(mb.exec()==QMessageBox::Yes)
            on_actionCreate_index_of_coptic_tables_triggered();
        m_msg()->MsgOk();
    }
    else if(i>0)
        m_msg()->MsgErr(tr("import failed!"));
}

void MainWnd::on_actionBennett_Latin_grammar_triggered()
{
    //library.openHtmlBook(&messages,QDir::toNativeSeparators("data/grammar/bennett/lg.htm"),CLibraryWidget::Html,QString(),tr("Latin grammar"),QIcon(":/new/icons/icons/lg.png"));

    MContentBook * b=new MContentBook();
    if(b)
    {
        b->show();
        m_sett()->wnds()->addNewWindow(b);
    }
}

void MainWnd::on_tabSearchResults_tabCloseRequested(int index)
{
    ui->tabSearchResults->removeTab(index);
}

void MainWnd::on_actionEdit_text_file_triggered()
{
    MNotepad * notp=new MNotepad();
    if(notp)
        notp->show();
}

void MainWnd::on_actionExport_archive_triggered()
{
    MExportArchive exparch;
    if(exparch.exec()==QDialog::Accepted)
    {

        QString const query_arch("select quote(`id`),quote(`author`),quote(`work`),quote(`comment`),quote(`filename`),quote(`category`),quote(`data_id`),quote(`i_count`),quote(`i_count_diff`),quote(`i_lat_count`),quote(`i_gk_count`),quote(`i_cop_count`),quote(`i_heb_count`) from `library_archive`"),
            query_data("select `id`,quote(`id`),quote(null),quote(`comment`),quote(`bytes`),quote(`tgz_title`),quote(`tgz_path`),quote(`type`) from `library_data`"),
            query_author("select quote(`id`),quote(`author`),quote(`comment`) from `library_author`"),
            query_branch("select quote(`id`),quote(`name`),quote(`branch`),quote(`ord`) from `library_branch`"),
            query_index("select quote(`archive_id`),quote(`lang`),quote(`word`),quote(`count`) from `library_mindex`");


        QString const tmpfilename(m_sett()->tmpDir()+QDir::separator()+"marcion-archive-data.dat");

        QFile f(exparch.exportFilename());
        if(f.open(QIODevice::WriteOnly))
        {
            unsigned int errs_count(0);

            USE_CLEAN_WAIT;

            CProgressDialog pd;

            MQUERY(q,query_arch);
            MQUERY(q2,query_data);
            MQUERY(q3,query_author);
            MQUERY(q4,query_branch);
            MQUERY(q5,query_index);

            int const size_all=q.size()+q2.size()+q3.size()+q4.size()+q5.size();

            REST_CURSOR;

            pd.initProgress(tr("exporting archive (works) ..."),size_all);
            pd.show();

            QString init_line(QString(" ").repeated(32));
            init_line.prepend(QApplication::applicationVersion()+";"+QString::number(size_all+q2.size()));
            int e=f.write(init_line.toUtf8().constData(),32);
            if(e!=32)
            {
                f.close();
                m_msg()->MsgErr(tr("cannot write into file '")+f.fileName()+"'");
                return;
            }

            while (q.next()) {
               QString line("insert into `library_archive` (`id`,`author`,`work`,`comment`,`filename`,`category`,`data_id`,`i_count`,`i_count_diff`,`i_lat_count`,`i_gk_count`,`i_cop_count`,`i_heb_count`) values (");
               for(unsigned int x=0;x<q.fieldCount();x++)
                    line.append(q.value(x)+QString(","));
               line.chop(1);
               line.append(")");
               line.append(CMySql::arch_delimiter);
               int e=f.write(line.toUtf8().constData());
               if(e==-1)
               {
                   f.close();
                   m_msg()->MsgErr(tr("cannot write into file '")+f.fileName()+"'");
                   return;
               }

               if(pd.stopped())
               {
                   pd.close();
                   f.close();
                   m_msg()->MsgInf(tr("progress interrupted"));
                   return;
               }
               pd.incProgress();
            }

            pd.setTitle(tr("exporting archive (authors) ..."));
            while (q3.next()) {
               QString line("insert into `library_author` (`id`,`author`,`comment`) values (");
               for(unsigned int x=0;x<q3.fieldCount();x++)
                    line.append(q3.value(x)+QString(","));
               line.chop(1);
               line.append(")");
               line.append(CMySql::arch_delimiter);
               int e=f.write(line.toUtf8().constData());
               if(e==-1)
               {
                   f.close();
                   m_msg()->MsgErr(tr("cannot write into file '")+f.fileName()+"'");
                   return;
               }

               if(pd.stopped())
               {
                   pd.close();
                   f.close();
                   m_msg()->MsgInf(tr("progress interrupted"));
                   return;
               }
               pd.incProgress();
            }

            pd.setTitle(tr("exporting archive (categories) ..."));
            while (q4.next()) {
               QString line("insert into `library_branch` (`id`,`name`,`branch`,`ord`) values (");
               for(unsigned int x=0;x<q4.fieldCount();x++)
                    line.append(q4.value(x)+QString(","));
               line.chop(1);
               line.append(")");
               line.append(CMySql::arch_delimiter);
               int e=f.write(line.toUtf8().constData());
               if(e==-1)
               {
                   f.close();
                   m_msg()->MsgErr(tr("cannot write into file '")+f.fileName()+"'");
                   return;
               }

               if(pd.stopped())
               {
                   pd.close();
                   f.close();
                   m_msg()->MsgInf(tr("progress interrupted"));
                   return;
               }
               pd.incProgress();
            }

            pd.setTitle(tr("exporting archive (indexes) ..."));
            while (q5.next()) {
               QString line("insert into `library_mindex` (`archive_id`,`lang`,`word`,`count`) values (");
               for(unsigned int x=0;x<q5.fieldCount();x++)
                    line.append(q5.value(x)+QString(","));
               line.chop(1);
               line.append(")");
               line.append(CMySql::arch_delimiter);
               int e=f.write(line.toUtf8().constData());
               if(e==-1)
               {
                   f.close();
                   m_msg()->MsgErr(tr("cannot write into file '")+f.fileName()+"'");
                   return;
               }

               if(pd.stopped())
               {
                   pd.close();
                   f.close();
                   m_msg()->MsgInf(tr("progress interrupted"));
                   return;
               }
               pd.incProgress();
            }

            pd.setTitle(tr("exporting archive (stored data, it may take some time) ..."));
            while (q2.next()) {
                QString const idstr(q2.value(0));
               QString line("insert into `library_data` (`id`,`data`,`comment`,`bytes`,`tgz_title`,`tgz_path`,`type`) values (");
               for(unsigned int x=1;x<q2.fieldCount();x++)
               {
                   if(x==2)
                        line.append(QString("null,"));
                   else
                        line.append(q2.value(x)+QString(","));
               }
               line.chop(1);
               line.append(")");
               line.append(CMySql::arch_delimiter);
               int e=f.write(line.toUtf8().constData());
               if(e==-1)
               {
                   f.close();
                   m_msg()->MsgErr(tr("cannot write into file '")+f.fileName()+"'");
                   return;
               }

               QString const query_getdata("select `data` from `library_data` where `id`="+idstr+" into dumpfile '"+tmpfilename+"'");
               MQUERY(q22,query_getdata);

               CMySql qp;
               int e2(0);
               size_t bytes(0),q_length(0);
               QString output;
               char * command(0);
               e2=qp.fileToBlob("update `library_data` set `bytes`=",",`data`='",QString("' where `id`="+idstr+CMySql::arch_delimiter_rq+CMySql::arch_delimiter).toUtf8().constData(),tmpfilename,output,bytes,&command,&q_length);

               if(QFile::remove(tmpfilename))
                   m_msg()->MsgMsg(tr("removing temporary file ... Ok."));
               else
               {
                   errs_count++;
                   m_msg()->MsgMsg(tr("removing temporary file ... Failed."));
               }

                if(e2==0)
               {
                    if(command)
                    {
                       e=f.write(command,q_length);
                       delete [] command;
                       if(e==-1)
                       {
                           f.close();
                           m_msg()->MsgErr(tr("cannot write into file '")+f.fileName()+"'");
                           return;
                       }
                    }
                }
                else
                {
                    errs_count++;
                    m_msg()->MsgMsg(tr("data cannot be retrieved for id=")+idstr+" !");
                }

               if(pd.stopped())
               {
                   pd.close();
                   f.close();
                   m_msg()->MsgInf(tr("progress interrupted"));
                   return;
               }
               pd.incProgress();
            }

            f.close();

            QString reportmsg(tr("archive was successfully exported with ")+QString::number(errs_count)+tr(" errors into file '")+f.fileName());
            if(exparch.compress())
            {
                if(errs_count==0)
                {
                    pd.setTitle(tr("compressing file (it may take some time) ..."));
                    pd.processEvents();
                    pd.repaint();
                    CMBzip bzfile(f.fileName(),m_msg());
                    bool bcf=bzfile.compress();
                    if(bcf)
                    {
                        QFile::remove(f.fileName());
                        reportmsg.append(tr("' and compressed."));
                    }
                    else
                        reportmsg.append(tr("'. Compression failed."));

                    m_msg()->MsgInf(reportmsg);
                }
                else
                {
                    reportmsg.append(tr("'. Compresion skipped."));
                    m_msg()->MsgWarn(reportmsg);
                }
            }
            else
            {
                reportmsg.append(tr("' without compression."));
                if(errs_count==0)
                    m_msg()->MsgInf(reportmsg);
                else
                    m_msg()->MsgWarn(reportmsg);
            }

            m_msg()->MsgOk();
        }
        else
            m_msg()->MsgErr(tr("cannot open file '")+f.fileName()+tr("' for writing"));
    }
}

void MainWnd::on_actionImport_data_triggered()
{
    MExportArchive ed(false);
    if(ed.exec()==QDialog::Accepted)
    {
        QFile f(ed.exportFilename());
        if(!f.exists())
        {
            m_msg()->MsgErr(tr("file '")+f.fileName()+tr("' does not exist! Aborted."));
            return;
        }

        if(f.fileName().endsWith(".bz2"))
        {
            ui->statusbar->showMessage(tr("Decompression of file is started."));

            SET_WAIT_CURSOR;
            //m_msg()->MsgInf(tr("File will be decompressed."));
            CMBzip bz(f.fileName(),m_msg());
            bool const bbz=bz.decompress();
            REST_CURSOR;

            if(bbz)
                f.setFileName(f.fileName().remove(QRegExp("\\.bz2$")));
            else
            {
                m_msg()->MsgErr(tr("Decompression failed! Interrupted."));
                return;
            }
        }
        QMessageBox mb(QMessageBox::Question,tr("delete archive"),tr("Entire archive will be deleted.\nContinue?"),QMessageBox::Ok|QMessageBox::Cancel,this);
        if(mb.exec()==QMessageBox::Ok)
        {
            SET_WAIT_CURSOR;

            QString query("call drop_archive(true,true)");
            MQUERY(q,query)
            m_msg()->MsgOk();
            _archW.readCategories(true);
            REST_CURSOR;


            if(f.open(QIODevice::ReadOnly))
            {
                CProgressDialog pd;

                char init_bytes[32];
                int init_bytes_c=f.read(&init_bytes[0],32);
                if(init_bytes_c!=32)
                {
                    f.close();
                    m_msg()->MsgErr(tr("file '")+f.fileName()+tr("' has not proper content!"));
                    return;
                }
                QString const sib(QString::fromUtf8(&init_bytes[0],32));
                QStringList sl=sib.split(QString(";"),QString::KeepEmptyParts);
                if(sl.count()<2)
                {
                    f.close();
                    m_msg()->MsgErr(tr("file '")+f.fileName()+tr("' has not proper content!"));
                    return;
                }
                int const cmd_count=sl.at(1).trimmed().toInt();
                pd.initProgress(tr("importing archive (it may take some time) ..."),cmd_count);
                pd.show();

                QByteArray b;
                char ch;
                unsigned int c(0),errs_count(0);
                int const dl(CMySql::arch_delimiter.length()),
                        dlrq(CMySql::arch_delimiter_rq.length());
                while(f.getChar(&ch))
                {
                    b.append(QChar(ch));
                    if(b.endsWith(CMySql::arch_delimiter.toUtf8()))
                    {
                        c++;
                        b.chop(dl);

                        bool real_query=b.endsWith(CMySql::arch_delimiter_rq.toUtf8());
                        CMySql q;
                        bool qres;

                        if(real_query)
                        {
                            b.chop(dlrq);
                            qres=q.execRealQuery(b.constData(),b.length());
                        }
                        else
                            qres=q.exec(b);

                        if(!qres)
                        {
                            errs_count++;
                            m_msg()->MsgMsg(tr("command ")+QString::number(c)+tr(" failed!"));
                            m_msg()->MsgMsg(q.lastError());
                        }
                        b.clear();

                        if(pd.stopped())
                        {
                            pd.close();
                            f.close();
                            m_msg()->MsgInf(tr("progress interrupted"));
                            _archW.readCategories(true);
                            return;
                        }
                        pd.incProgress();
                    }
                }
                f.close();
                m_msg()->MsgInf(tr("archive was imported with ")+QString::number(errs_count)+tr(" errors"));
                _archW.readCategories(true);
            }
            else
                m_msg()->MsgErr(tr("cannot open file '")+f.fileName()+tr("' for reading"));
        }
    }
}

void MainWnd::on_actionShow_tip_triggered()
{
    MTipOfTheWiseMan * tip_wnd=new MTipOfTheWiseMan();
    if(tip_wnd)
        tip_wnd->show();
}

void MainWnd::on_action_re_create_index_of_Gk_Lat_dictionary_triggered()
{
    QMessageBox mb( QMessageBox::Question,tr("create index"),tr("Index of Greek and Latin dictionary will be re-created.\nContinue?"), QMessageBox::Yes | QMessageBox::No);
    if(mb.exec()==QMessageBox::Yes)
    {
        USE_CLEAN_WAIT;

        m_msg()->MsgMsg(tr("creating index of greek and latin dictionary ..."));
        QString const query("truncate table `dict_index`"),
                query2("select `id`,`sense` from `dict_senses`");
        MQUERY(q,query);
        MQUERY(q2,query2);

        QRegExp r("<trans>.*</trans>"),r2("<.*>");
        r.setMinimal(true);
        r2.setMinimal(true);

        while(q2.next())
        {
            QString const id(q2.value(0));
            QString sense(q2.value(1));


            QString query("insert into `dict_index` (`sense_id`,`word`,`sense`) values (");
            bool _exec(false);
            while(r.indexIn(sense)!=-1)
            {
                QString s(r.cap());
                sense.remove(s);
                s.remove(r2);
                QStringList const sl(s.split(QString(" "),QString::SkipEmptyParts));
                for(int x=0;x<sl.count();x++)
                {
                    QString s2(sl.at(x));
                    s2=CTranslit::tr(s2,CTranslit::LatinNToLatinTr,true,CTranslit::RemoveAll);
                    if(!s2.isEmpty())
                    {
                        query.append(id+QString(",'")+s2+"',true),(");
                        _exec=true;
                    }
                }
            }
            if(_exec)
            {
                query.chop(2);
                MQUERY_NOMSG(q3,query);
            }

            _exec=false;
            QString query4("insert into `dict_index` (`sense_id`,`word`,`sense`) values (");
            sense.remove(r2);
            QStringList const sl(sense.split(QString(" "),QString::SkipEmptyParts));
            for(int x=0;x<sl.count();x++)
            {
                QString s2(sl.at(x));
                s2=CTranslit::tr(s2,CTranslit::LatinNToLatinTr,true,CTranslit::RemoveAll);
                if(!s2.isEmpty())
                {
                    query4.append(id+QString(",'")+s2+"',false),(");
                    _exec=true;
                }
            }
            if(_exec)
            {
                query4.chop(2);
                MQUERY_NOMSG(q4,query4);
            }
        }
    }
}
