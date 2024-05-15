#include "mpdfreader2.h"
#include "ui_mpdfreader2.h"

MPdfReader2::MPdfReader2(QString const & filename,QString const & show_text,QWidget *parent) :
    QMainWindow(parent),
    ui(new Ui::MPdfReader2),
    filename(filename),
    pdfdoc(0),
    ppage(0),
    last_search(0,0,0,0),
    _items_on_page(),_items_on_page2(),
    last_g_item(0),
    pdfText(),
    s_text(),
    s_case(true),
    _found_rects(),
    _frects_iter(-1),
    _stop(false),
    _doc_pages_count(0),
    current_dpi(100),
    current_dpi_mode(Percent),
    current_rot(Poppler::Page::Rotate0),
    _agrp(0),_agrp_dpi(0),
    _sbwdg(),
    _spnPercent(),
    _fbutt(),
    _bm_menu(tr("&go to bookmark")),
    _bmrm_menu(tr("&remove bookmark")),
    _content_menu(),
    _gk(0),_cop(0),_num(0),_heb(0)
{
    ui->setupUi(this);

    ui->wdgScrInp->allowChangeScript();
    ui->wdgScrInp->setSwitchState(true);

    _spnPercent.setRange(10,1600);
    _spnPercent.setSingleStep(10);
    _spnPercent.setSuffix(" %");
    _spnPercent.setButtonSymbols(QSpinBox::NoButtons);
    _spnPercent.setSizePolicy(QSizePolicy::Preferred,QSizePolicy::Fixed);
    _spnPercent.setAlignment(Qt::AlignHCenter|Qt::AlignVCenter);
    connect(&_spnPercent,SIGNAL(editingFinished()),this,SLOT(slot_percent()));

    ui->statusBar->addPermanentWidget(&_sbwdg);

    ui->wdgHeader->initFirstButton(QIcon(":/new/icons/icons/pdf_icon.png"),tr("&document"));
    ui->wdgHeader->setStWdg(ui->stwPdf);

    ui->btInpMode->setChecked(true);
    ui->stwInp->setCurrentIndex(0);

    _agrp.addAction(ui->action0);
    _agrp.addAction(ui->action90);
    _agrp.addAction(ui->action180);
    _agrp.addAction(ui->action270);
    _agrp.setExclusive(true);
    ui->action0->setChecked(true);

    _agrp_dpi.addAction(ui->actionFit_width);
    _agrp_dpi.addAction(ui->actionFit_height);
    _agrp_dpi.setExclusive(true);
    ui->actionFit_width->setChecked(false);
    ui->actionFit_height->setChecked(false);

    ui->cmbSearch->completer()->setCaseSensitivity(Qt::CaseSensitive);
    ui->cmbSearch->completer()->setCompletionMode(QCompleter::PopupCompletion);


    ui->cchSelColor->init("black","yellow",tr("fill color"),CTextColorChooser::Background);
    ui->cchBorderColor->init("white","black",tr("border color"),CTextColorChooser::Background);

    ui->wdgLinks->hide();
    ui->wdgProgress->hide();
    ui->wdgFind->hide();
    ui->wdgPdfSett->hide();
    ui->dwSR->hide();

    _bm_menu.setIcon(QIcon(":/new/icons/icons/go.png"));
    _bmrm_menu.setIcon(QIcon(":/new/icons/icons/delete.png"));

    ui->menuBookmarks->insertMenu(ui->actionDrop_all,&_bm_menu);
    ui->menuBookmarks->insertSeparator(ui->actionDrop_all);
    ui->menuBookmarks->insertMenu(ui->actionDrop_all,&_bmrm_menu);

    connect(&_bm_menu,SIGNAL(triggered(QAction*)),this,SLOT(slot_bm_triggered(QAction*)));
    connect(&_bmrm_menu,SIGNAL(triggered(QAction*)),this,SLOT(slot_bmrm_triggered(QAction*)));

    _bm_menu.setEnabled(false);
    _bmrm_menu.setEnabled(false);

    _a_goto=_content_menu.addAction(QIcon(":/new/icons/icons/go.png"),tr("&go to"));
    _content_menu.addSeparator();
    _a_expand=_content_menu.addAction(tr("&expand"));
    _a_collapse=_content_menu.addAction(tr("&collapse"));
    _a_expand_all=_content_menu.addAction(tr("e&xpand all"));
    _a_collapse_all=_content_menu.addAction(tr("c&ollapse all"));

    _fbutt.setIcon(QIcon(":/new/icons/icons/loupe.png"));
    _fbutt.setText(tr("find"));
    _fbutt.setToolTip(tr("find"));
    _fbutt.setToolButtonStyle(Qt::ToolButtonIconOnly);
    _fbutt.setSizePolicy(QSizePolicy::Preferred,QSizePolicy::Preferred);
    _fbutt.setCheckable(true);
    _fbutt.setChecked(false);
    connect(&_fbutt,SIGNAL(clicked(bool)),this,SLOT(slot_fbutt(bool)));
    ui->tbarTools->addWidget(&_fbutt);
    ui->tbarTools->addSeparator();
    ui->tbarTools->addWidget(&_spnPercent);
    ui->tbarTools->addAction(QIcon(":/new/icons/icons/loupe_plus.png"),tr("plus 10%"),this,SLOT(slot_dpiplus()));
    ui->tbarTools->addAction(QIcon(":/new/icons/icons/loupe_minus.png"),tr("minus 10%"),this,SLOT(slot_dpiminus()));
    ui->tbarTools->addSeparator();
    ui->tbarTools->addAction(QIcon(":/new/icons/icons/rotleft.png"),tr("rotate left"),this,SLOT(slot_rotateleft()));
    ui->tbarTools->addAction(QIcon(":/new/icons/icons/rotright.png"),tr("rotate right"),this,SLOT(slot_rotateright()));
    ui->tbarTools->addSeparator();
    ui->tbarTools->addAction(QIcon(":/new/icons/icons/alfa2.png"),tr("Gk/Lat dictionary"),this,SLOT(on_actionGk_Lat_dictionary_triggered()));
    ui->tbarTools->addAction(QIcon(":/new/icons/icons/gima.png"),tr("Coptic dictionary"),this,SLOT(on_actionCoptic_dictionary_triggered()));
    ui->tbarTools->addAction(QIcon(":/new/icons/icons/abgd.png"),tr("Hebrew dictionary"),this,SLOT(on_action_Hebrew_dictionary_triggered()));

    ui->iwPdfImg->drawarea()->setImageMode(CMImage::Pdf,&_fbutt);

    ui->treeLinks->header()->setResizeMode(QHeaderView::ResizeToContents);

    connect(ui->iwPdfImg->drawarea(),SIGNAL(copyTextRequested(QRectF,int)),this,SLOT(slot_copyText(QRectF,int)));
    connect(ui->iwPdfImg->drawarea(),SIGNAL(showLinksRequested()),this,SLOT(slot_showLinks()));
    connect(ui->iwPdfImg->drawarea(),SIGNAL(showFontsRequested()),this,SLOT(slot_showFonts()));

    connect(ui->iwPdfImg->drawarea(),SIGNAL(resizeRequested(bool)),this,SLOT(slot_iwImg_resizeRequested(bool)));

    pdfdoc = Poppler::Document::load(filename);

    if(!pdfdoc||pdfdoc->isLocked())
    {
        m_msg()->MsgErr(tr("cannot open pdf file '")+filename+"'");
        setEnabled(false);
    }
    else
    {
        QDomDocument * ddoc=pdfdoc->toc();

        if(ddoc)
        {
            QList<MPdfTOCDestItem*> toci;
            QDomElement e=ddoc->firstChildElement();
            while(!e.isNull())
            {
                MPdfTOCDestItem * i=new MPdfTOCDestItem(e);
                toci.append(i);
                i->setText(0,e.tagName());
                ui->treeTOC->addTopLevelItem(i);
                tocBranch(e,i,toci);
                e=e.nextSiblingElement();
            }

            for(int x=0;x<toci.count();x++)
            {
                MPdfTOCDestItem * i(toci.at(x));
                i->setExpanded(i->_expand);
            }

            ui->dwTOC->show();
            ui->actionTable_of_contents->setEnabled(true);
        }
        else
        {
            ui->dwTOC->hide();
            ui->actionTable_of_contents->setEnabled(false);
        }

        ui->wdgSpinIter->setMinimumValue(1);
        ui->wdgSpinIter->setMaximumValue(_doc_pages_count=pdfdoc->numPages());

        if(_doc_pages_count>=1)
        {
            setCurRotation(current_rot);
            setCurrentDpi(current_dpi);
            ui->lblPgNum->setText("/"+QString::number(_doc_pages_count));
            _sbwdg.setPgMaxValue(_doc_pages_count);
            showPage(0,true);
            ui->statusBar->showMessage(tr("document loaded"),10000);
        }

        if(!show_text.isEmpty())
        {
            ui->cmbSearch->addItem(show_text);
            on_btAll_clicked();
        }
    }

    connect(ui->menuView,SIGNAL(aboutToShow()),this,SLOT(slot_mnuView()));
    connect(ui->menu_rotate,SIGNAL(aboutToShow()),this,SLOT(slot_mnuRot()));
    connect(ui->menu_zoom,SIGNAL(aboutToShow()),this,SLOT(slot_mnuDpi()));
    connect(ui->menu_rotate,SIGNAL(triggered(QAction*)),this,SLOT(slot_mnuRotTrg(QAction*)));
    connect(ui->menu_zoom,SIGNAL(triggered(QAction*)),this,SLOT(slot_mnuDpiTrg(QAction*)));

    ICTB_SIZES
}

MPdfReader2::~MPdfReader2()
{
    RM_WND;

    if(_gk)
        delete _gk;
    if(_cop)
        delete _cop;
    if(_num)
        delete _num;
    if(ppage)
        delete ppage;
    if(pdfdoc)
        delete pdfdoc;

    delete ui;
}

//

void MPdfReader2::slot_bm_triggered(QAction* a)
{
    ui->wdgHeader->setDocMode();
    if(a)
        ui->wdgSpinIter->setCurrentValue(a->data().toInt());
}

void MPdfReader2::slot_bmrm_triggered(QAction* a)
{
    ui->wdgHeader->setDocMode();
    if(a)
    {
        int const pgnum=a->data().toInt();
        for(int x=0;x<_bm_menu.actions().count();x++)
        {
            QAction * const ai(_bm_menu.actions().at(x));
            if(ai->data().toInt()==pgnum)
            {
                _bm_menu.removeAction(ai);
                ui->statusBar->showMessage(tr("bookmark on page ")+QString::number(pgnum)+tr(" dropped"),5000);
                break;
            }
        }
        _bmrm_menu.removeAction(a);

        int const bc=_bm_menu.actions().count();
        if(bc==0)
        {
            _bm_menu.clear();
            _bm_menu.setEnabled(false);
            _bmrm_menu.clear();
            _bmrm_menu.setEnabled(false);

            ui->tbBookmarks->setEnabled(false);
        }

        ui->lblBm->setText(QString::number(bc));
    }
}

void MPdfReader2::slot_rotateleft()
{
    rotatePage(false);
}

void MPdfReader2::slot_rotateright()
{
    rotatePage(true);
}

void MPdfReader2::slot_dpiplus()
{
    slot_iwImg_resizeRequested(false);
    ui->wdgHeader->setDocMode();
}

void MPdfReader2::slot_dpiminus()
{
    slot_iwImg_resizeRequested(true);
    ui->wdgHeader->setDocMode();
}

double MPdfReader2::setCurrentDpi(double newdpi)
{
    _sbwdg.setPercentValue((unsigned short)newdpi);
    _spnPercent.setValue((int)newdpi);
    return current_dpi=newdpi;
}

void MPdfReader2::slot_mnuView()
{
    ui->actionFind->setChecked(ui->wdgFind->isVisible());
    ui->actionAppearance->setChecked(ui->wdgPdfSett->isVisible());
    ui->actionToolbar->setChecked(ui->tbarTools->isVisible());
}

void MPdfReader2::slot_mnuRot()
{
    switch(current_rot)
    {
    case Poppler::Page::Rotate0 :
        ui->action0->setChecked(true);
        break;
    case Poppler::Page::Rotate90 :
        ui->action90->setChecked(true);
        break;
    case Poppler::Page::Rotate180 :
        ui->action180->setChecked(true);
        break;
    case Poppler::Page::Rotate270 :
        ui->action270->setChecked(true);
        break;
    }
}

void MPdfReader2::slot_percent()
{
    if(_spnPercent.value()!=(int)current_dpi)
    {
        ui->wdgHeader->setDocMode();
        current_dpi_mode=Percent;
        setCurrentDpi((double)_spnPercent.value());
        int const v=ui->wdgSpinIter->currentValue();
        if(v>=1)
            showPage(v-1,true);
    }
}

void MPdfReader2::slot_mnuDpi()
{
    switch(current_dpi_mode)
    {
    case FitWidth :
        ui->actionFit_width->setChecked(true);
        break;
    case FitHeight :
        ui->actionFit_height->setChecked(true);
        break;
    case Percent :
        ui->actionFit_width->setChecked(false);
        ui->actionFit_height->setChecked(false);
        break;
    }
}

void MPdfReader2::slot_mnuRotTrg(QAction* a)
{
    ui->wdgHeader->setDocMode();
    if(a)
    {
        if(a==ui->action0)
            setCurRotation(Poppler::Page::Rotate0);
        else if(a==ui->action90)
            setCurRotation(Poppler::Page::Rotate90);
        else if(a==ui->action180)
            setCurRotation(Poppler::Page::Rotate180);
        else if(a==ui->action270)
            setCurRotation(Poppler::Page::Rotate270);
        showPage(ui->wdgSpinIter->currentValue()-1,true);
        ui->treeSearchRes->clear();
        ui->dwSR->setVisible(false);
    }
}

void MPdfReader2::slot_mnuDpiTrg(QAction* a)
{
    ui->wdgHeader->setDocMode();
    if(a)
    {
        if(a==ui->actionFit_width)
        {
            current_dpi_mode=FitWidth;
        }
        else if(a==ui->actionFit_height)
        {
            current_dpi_mode=FitHeight;
        }
        else if(a==ui->action25)
        {
            current_dpi_mode=Percent;
            setCurrentDpi(25);
        }
        else if(a==ui->action50)
        {
            current_dpi_mode=Percent;
            setCurrentDpi(50);
        }
        else if(a==ui->action100)
        {
            current_dpi_mode=Percent;
            setCurrentDpi(100);
        }
        else if(a==ui->action200)
        {
            current_dpi_mode=Percent;
            setCurrentDpi(200);
        }
        else if(a==ui->action400)
        {
            current_dpi_mode=Percent;
            setCurrentDpi(400);
        }
        else if(a==ui->action800)
        {
            current_dpi_mode=Percent;
            setCurrentDpi(800);
        }
        else if(a==ui->action_10)
        {
            slot_iwImg_resizeRequested(false);
        }
        else if(a==ui->action_11)
        {
            slot_iwImg_resizeRequested(true);
        }
        else if(a==ui->actionCustom)
        {
            ui->tbarTools->show();
            _spnPercent.setFocus();
            _spnPercent.setValue((int)current_dpi);
            _spnPercent.selectAll();
        }
        showPage(ui->wdgSpinIter->currentValue()-1,true);
    }
}

void MPdfReader2::on_actionRotate_left_triggered()
{
    rotatePage(false);
}

void MPdfReader2::on_actionRotate_right_triggered()
{
    rotatePage(true);
}

void MPdfReader2::rotatePage(bool right)
{
    ui->wdgHeader->setDocMode();
    switch(current_rot)
    {
    case Poppler::Page::Rotate0 :
        setCurRotation(right?Poppler::Page::Rotate90:Poppler::Page::Rotate270);
        break;
    case Poppler::Page::Rotate90 :
        setCurRotation(right?Poppler::Page::Rotate180:Poppler::Page::Rotate0);
        break;
    case Poppler::Page::Rotate180 :
        setCurRotation(right?Poppler::Page::Rotate270:Poppler::Page::Rotate90);
        break;
    case Poppler::Page::Rotate270 :
        setCurRotation(right?Poppler::Page::Rotate0:Poppler::Page::Rotate180);
        break;
    }
    showPage(ui->wdgSpinIter->currentValue()-1,true);
}

void MPdfReader2::showPage(int pagenum,bool show)
{
    USE_CLEAN_WAIT
    clearItemsOnPage();
    if(ppage)
        delete ppage;
    ppage = pdfdoc->page(pagenum);
    if(show)
    {
        if(ppage)
        {
            showPage(ppage,true);
            _sbwdg.setPgNumValue(pagenum+1);
            m_msg()->MsgMsg(tr("pdf page ")+QString::number(pagenum)+tr(" of file '")+filename+tr("' loaded & displayed"));
            if(ui->btHighlight->isChecked())
                highlightAll();
        }
        else
            m_msg()->MsgErr(tr("cannot load pdf page ")+QString::number(pagenum)+tr(" of file '")+filename+"'");
    }
}

void MPdfReader2::showPage(Poppler::Page * ppage,bool top)
{
    double dpi(percentToDpi());

    QImage i(ppage->renderToImage(dpi,dpi,-1,-1,-1,-1,current_rot));
    ui->iwPdfImg->drawarea()->clearPixmap();
    QPixmap const pm(QPixmap::fromImage(i));
    ui->iwPdfImg->drawarea()->setPixmap(pm);
    ui->iwPdfImg->drawarea()->setSceneRect(pm.rect());
    if(current_dpi_mode==FitWidth||current_dpi_mode==FitHeight)
        setCurPercent((current_rot==Poppler::Page::Rotate0||current_rot==Poppler::Page::Rotate180)?pm.width():pm.height());

    if(top)
        ui->iwPdfImg->drawarea()->centerOn(0,0);
    if(ui->wdgLinks->isVisible())
        slot_showLinks();
}

void MPdfReader2::on_wdgSpinIter_valueChanged(int new_value,int )
{
    static int old_value(-1);

    /*if(invoker==MSpinIter::Edit&&old_value==new_value)
        return;*/

    if(old_value!=new_value)
        if(new_value>=1)
            showPage(new_value-1,true);
    old_value=new_value;
}

void MPdfReader2::on_btSearchPrev_clicked()
{
    highlightOne(0,-1);
}

void MPdfReader2::on_btSearchNext_clicked()
{
    highlightOne(0,1);
}

void MPdfReader2::on_btSearchTop_clicked()
{
    highlightOne(1,0);
}

void MPdfReader2::on_btSearchBottom_clicked()
{
    highlightOne(2,0);
}

bool MPdfReader2::searchInPage(Poppler::Page::SearchDirection d, QString const & text, bool c_ins)
{
    if(ppage)
    {
        if(d==Poppler::Page::FromTop)
            last_search=QRectF(0,0,0,0);

        return ppage->search(text,last_search,d,(c_ins?Poppler::Page::CaseInsensitive:Poppler::Page::CaseSensitive),current_rot);
    }
    return false;
}

void MPdfReader2::highlightOne(int fixed,int offset)
{
    int c=_found_rects.count()-1;
    if(c<0)
    {
        _frects_iter=-1;
    }
    else
    {
        if(fixed>0)
        {
            if(fixed==1)
                _frects_iter=0;
            else
                _frects_iter=c;
        }
        else
        {
            int ni=_frects_iter+offset;
            if(ni>=0&&ni<=c)
                _frects_iter=ni;
            else if(ni>c)
                _frects_iter=0;
            else if(ni<0)
                _frects_iter=c;
        }
        showRect(_found_rects.at(_frects_iter));
    }
}

void MPdfReader2::showRect(QRectF rect)
{
    if(last_g_item)
        delete last_g_item;

    double const q=(double)percentToDpi()/(double)72;
    qreal border=(qreal)ui->spnBorderWidth->value();

    QRectF r2((rect.x()*q)-(border/2),(rect.y()*q)-(border/2),(rect.width()*q)+(border/2),(rect.height()*q)+(border/2));

    last_g_item=(QGraphicsItem*)ui->iwPdfImg->drawarea()->grScene()->addRect(r2,QPen(ui->cchBorderColor->bgC(),(int)border),QBrush());
    ui->iwPdfImg->drawarea()->ensureVisible(last_g_item);
}

void MPdfReader2::on_btStopSearch_clicked()
{
    _stop=true;
}

void MPdfReader2::on_btAll_clicked()
{
    s_text.clear();
    s_case=true;

    switch(ui->stwInp->currentIndex())
    {
    case 0 :
        CLatCopt::updateHistory(ui->cmbSearch);
        s_text=ui->cmbSearch->currentText();
        s_case=ui->cbCaseInsensitive->isChecked();
        break;
    case 1 :
        ui->wdgScrInp->updateHistory();
        s_text=ui->wdgScrInp->text_utf8();
        s_case=true;
        break;
    }

    clearItemsOnPage();
    if(!s_text.isEmpty())
    {
        if(pdfText.count()==0)
            loadPdfText();

        searchAll(s_text,s_case);
        ui->dwSR->setVisible(true);
    }
    else
        QMessageBox(QMessageBox::Information,tr("pdf search"),tr("field is empty"),QMessageBox::Close,this).exec();
}

void MPdfReader2::searchAll(QString const & text,bool c_s)
{
    USE_CLEAN_WAIT
    ui->treeSearchRes->clear();
    ui->lblSText->setText(text+(c_s?QString(" (CI)"):QString(" (CS)")));
    ui->lblSText->setToolTip(ui->lblSText->text());

    Qt::CaseSensitivity cs(c_s?Qt::CaseInsensitive:Qt::CaseSensitive);

    for(int x=0;x<pdfText.count();x++)
    {
        QString s(pdfText[x]);
        int i(s.indexOf(text,0,cs));
        if(i!=-1)
        {
            QTreeWidgetItem * item=new QTreeWidgetItem(0);
            item->setText(0,QString::number(x+1));

            while(i!=-1)
            {
                CPdfTextItem2 * i2=new CPdfTextItem2();
                i2->setText(0,"pos: "+QString::number(i));
                i=s.indexOf(text,i+1,cs);
                item->addChild(i2);
            }

            ui->treeSearchRes->addTopLevelItem(item);
        }
    }
}

void MPdfReader2::loadPdfText()
{
    USE_CLEAN_WAIT
    pdfText.clear();

    int np(pdfdoc->numPages());

    ui->pbSearch->setMaximum(np);
    ui->pbSearch->setValue(0);
    ui->wdgProgress->setVisible(true);

    _stop=false;
    for(int x=0;x<np;x++)
    {
        Poppler::Page * p=pdfdoc->page(x);
        if(p)
        {
            pdfText.append(p->text(QRectF()));
            delete p;
        }
        ui->pbSearch->setValue(x);
        QApplication::processEvents(QEventLoop::AllEvents);
        if(_stop)
            break;
    }
    ui->wdgProgress->setVisible(false);
}

void MPdfReader2::on_treeSearchRes_itemDoubleClicked(QTreeWidgetItem *item, int )
{
    on_treeSearchRes_currentItemChanged(item,0);
}

void MPdfReader2::on_treeSearchRes_currentItemChanged(QTreeWidgetItem* current, QTreeWidgetItem* previous)
{
    if(current)
    {
        if(ui->btHighlight->isChecked())
        {
            ui->btHighlight->setChecked(false);
            on_btHighlight_clicked(false);
        }

        if(current->childCount()==0)
        {
            int ci(current->parent()->text(0).toInt());
            if(current!=previous)
            {
                ui->wdgSpinIter->setCurrentValue(ci);
                highlightAll(current->parent());
            }
            else if(_items_on_page.isEmpty())
                showRectsOnPage(current->parent());
            showRect(((CPdfTextItem2*)current)->_rect);
        }
        else
        {
            int ci(current->text(0).toInt());
            if(current!=previous)
                ui->wdgSpinIter->setCurrentValue(ci);
            highlightAll(current);
        }
    }
}

void MPdfReader2::loadRectsOnPage(QString const & text,bool cs)
{
    if(_found_rects.isEmpty())
    {
        Poppler::Page::SearchDirection d(Poppler::Page::FromTop);
        while(searchInPage(d,text,cs))
        {
            d=Poppler::Page::NextResult;
            if(!_found_rects.contains(last_search))
                _found_rects.append(last_search);
        }
        ui->btHighlight->setText(QString::number(_found_rects.count()));
    }
}

void MPdfReader2::loadRectsOnPage(QTreeWidgetItem* current)
{
    int const ch_c(current->childCount());
    if(ch_c>0)
    {
        if(((CPdfTextItem2*)current->child(0))->_rect.isNull())
        {
            USE_CLEAN_WAIT
            Poppler::Page::SearchDirection d(Poppler::Page::FromTop);
            int x(0);
            QList<QRectF> _r;
            while(searchInPage(d,s_text,s_case))
            {
                d=Poppler::Page::NextResult;
                if(x<ch_c)
                {
                    if(!_r.contains(last_search))
                    {
                        CPdfTextItem2 * i((CPdfTextItem2*)current->child(x++));
                        i->_rect=last_search;
                        _r.append(last_search);
                    }
                }
            }
        }
    }
}

void MPdfReader2::clearItemsOnPage()
{
    for(int x=0;x<_items_on_page.count();x++)
        delete _items_on_page[x];
    for(int x=0;x<_items_on_page2.count();x++)
        delete _items_on_page2[x];

    _items_on_page.clear();
    _items_on_page2.clear();
    _found_rects.clear();
    _frects_iter=-1;

    if(last_g_item)
    {
        delete last_g_item;
        last_g_item=0;
    }
    ui->btHighlight->setText(QString("?"));
    ui->iwPdfImg->drawarea()->grScene()->update();
}

void MPdfReader2::highlightAll()
{
    clearItemsOnPage();
    QString text;
    bool cs=true;
    switch(ui->stwInp->currentIndex())
    {
    case 0 :
        text=ui->cmbSearch->currentText();
        cs=ui->cbCaseInsensitive->isChecked();
        break;
    case 1 :
        text=ui->wdgScrInp->text_utf8();
        cs=true;
        break;
    }

    if(!text.isEmpty())
    {
        loadRectsOnPage(text,cs);

        double dpi(percentToDpi());

        for(int x=0;x<_found_rects.count();x++)
        {
            QRectF last_search(_found_rects.at(x));
            double q=(double)dpi/(double)72;

            QRect r2(last_search.toRect().x()*q,last_search.toRect().y()*q,last_search.toRect().width()*q,last_search.toRect().height()*q);
            QRectF r3(r2);

            QColor c(ui->cchSelColor->bgC());
            c.setAlpha((int)((double)2.55*(double)ui->spnSelOpacity->value()));
            _items_on_page2.append((QGraphicsItem*)ui->iwPdfImg->drawarea()->grScene()->addRect(r3,QPen(c),QBrush(c)));

            if(_items_on_page2.count()>0&&_found_rects.count()>0)
            {
                _frects_iter=0;
                showRect(_found_rects.first());
                ui->iwPdfImg->drawarea()->ensureVisible(_items_on_page2.first());
                ui->wdgButtons->setEnabled(true);
            }
            else
                ui->wdgButtons->setEnabled(false);
        }
    }
}

void MPdfReader2::showRectsOnPage(QTreeWidgetItem* item)
{
    double dpi(percentToDpi());

    for(int x=0;x<item->childCount();x++)
    {
        CPdfTextItem2* i2=(CPdfTextItem2*)item->child(x);
        QRectF last_search(i2->_rect);
        double q=(double)dpi/(double)72;

        QRect r2(last_search.toRect().x()*q,last_search.toRect().y()*q,last_search.toRect().width()*q,last_search.toRect().height()*q);
        QRectF r3(r2);

        QColor c(ui->cchSelColor->bgC());
        c.setAlpha((int)((double)2.55*(double)ui->spnSelOpacity->value()));
        _items_on_page.append((QGraphicsItem*)ui->iwPdfImg->drawarea()->grScene()->addRect(r3,QPen(c),QBrush(c)));

        if(_items_on_page.count()>0)
            ui->iwPdfImg->drawarea()->ensureVisible(_items_on_page.first());
    }
}

void MPdfReader2::highlightAll(QTreeWidgetItem* item)
{
    clearItemsOnPage();
    loadRectsOnPage(item);
    showRectsOnPage(item);
}

void MPdfReader2::slot_showLinks()
{
    ui->wdgLinks->show();
    ui->treeLinks->clear();

    QList<Poppler::Link*> plinks(ppage->links());
    for(int x=0;x<plinks.count();x++)
    {
        Poppler::Link * link(plinks.at(x));
        QTreeWidgetItem * item=new QTreeWidgetItem(0);
        switch(link->linkType())
        {
        case Poppler::Link::None :
            item->setText(0,tr("unknown"));
            break;
        case Poppler::Link::Goto :
        {
            Poppler::LinkGoto * elink((Poppler::LinkGoto *)link);
            Poppler::LinkDestination ldest(elink->destination());
            item->setText(0,tr("goto"));
            item->setText(1,QString::number(ldest.pageNumber()));
            item->setText(2,elink->fileName());
            break;
        }
        case Poppler::Link::Execute :
            item->setText(0,tr("execute"));
            break;
        case Poppler::Link::Browse :
            {
                Poppler::LinkBrowse * elink((Poppler::LinkBrowse *)link);
                item->setText(0,tr("browse"));
                item->setText(2,elink->url());
                break;
            }
        case Poppler::Link::Action :
            item->setText(0,tr("action"));
            break;
        case Poppler::Link::Sound :
            item->setText(0,tr("sound"));
            break;
        case Poppler::Link::Movie :
            item->setText(0,tr("movie"));
            break;
        case Poppler::Link::JavaScript :
            item->setText(0,tr("javascript"));
            break;
        }

        ui->treeLinks->addTopLevelItem(item);
    }
}

void MPdfReader2::slot_showFonts()
{
    QList<Poppler::FontInfo> fonts=pdfdoc->fonts();
    QString finf("\n'"+filename+tr("': fonts count: ")+QString::number(fonts.count())+"\n");
    for(int x=0;x<fonts.count();x++)
    {
        Poppler::FontInfo fi(fonts.at(x));
        finf.append(tr("name: ")+fi.name()+" | ");
        finf.append(tr("file: ")+fi.file()+" | ");
        finf.append(tr("embedded: ")+(fi.isEmbedded()?tr("yes"):tr("no"))+" | ");
        finf.append(tr("subset: ")+(fi.isSubset()?tr("yes"):tr("no"))+" | ");
        finf.append(tr("type: ")+fi.typeName()+"\n");
    }
    m_msg()->MsgMsg(finf);
    m_msg()->activateMessages();
}

void MPdfReader2::slot_copyText(QRectF rect,int mode)
{
    double x((double)72/percentToDpi());
    double px=ui->iwPdfImg->drawarea()->getPixmap().width()*x,py=ui->iwPdfImg->drawarea()->getPixmap().height()*x;
    QRectF crect(rect.x()*x,rect.y()*x,rect.width()*x,rect.height()*x),nrect;
    switch(current_rot)
    {
    case Poppler::Page::Rotate0 :
        nrect=crect;
        break;
    case Poppler::Page::Rotate90 :
        nrect.setX(crect.y());
        nrect.setY(px-crect.x()-crect.width());
        nrect.setWidth(crect.height());
        nrect.setHeight(crect.width());
        break;
    case Poppler::Page::Rotate180 :
        nrect.setX(px-crect.x()-crect.width());
        nrect.setY(py-crect.y()-crect.height());
        nrect.setWidth(crect.width());
        nrect.setHeight(crect.height());
        break;
    case Poppler::Page::Rotate270 :
        nrect.setX(py-crect.y()-crect.height());
        nrect.setY(crect.x());
        nrect.setWidth(crect.height());
        nrect.setHeight(crect.width());
        break;
    }

    QString const t(ppage->text(nrect).trimmed());
    QApplication::clipboard()->setText(t);
    m_msg()->MsgMsg(tr("copied text: '")+t+"'");

    switch(mode)
    {
    case CMImage::Dict :
    {
        if(CTranslit::isCoptic(t))
        {
            on_actionCoptic_dictionary_triggered();
            _cop->queryCoptic(t);
        }
        else
        {
            on_actionGk_Lat_dictionary_triggered();
            bool gk;
            _gk->prepareParse(t,gk=CTranslit::isGreek(t));
            _gk->parse(gk);
        }
        break;
    }
    case CMImage::Conv :
    {
        on_action_numeric_converter_triggered();
        _num->convertNumber(t);
        break;
    }
    }
}

bool MPdfReader2::extractText(QString const & file_name,QString & text)
{
    Poppler::Document * newpdfdoc = Poppler::Document::load(file_name);

    if(!newpdfdoc||newpdfdoc->isLocked())
    {
        m_msg()->MsgErr(tr("cannot open pdf file '")+file_name+"'");
        return false;
    }

    int np(newpdfdoc->numPages());

    for(int x=0;x<np;x++)
    {
        Poppler::Page * p=newpdfdoc->page(x);
        if(p)
        {
            text.append(p->text(QRectF()));
            delete p;
        }
        QApplication::processEvents(QEventLoop::AllEvents);
    }

    delete newpdfdoc;
    return true;
}

void MPdfReader2::on_treeLinks_itemDoubleClicked(QTreeWidgetItem* , int )
{
    on_btLinkGoTo_clicked();
}

void MPdfReader2::on_btLinkGoTo_clicked()
{
    QTreeWidgetItem * item(ui->treeLinks->currentItem());
    if(item)
    {
        bool pnum(!item->text(1).isEmpty()),ptarg(!item->text(2).isEmpty());
        int p_num(item->text(1).toInt());
        QString url(item->text(2));
        m_msg()->MsgMsg(tr("pdf file: link activated, page ")+QString::number(p_num)+tr(", target '")+url+"'");
        if(pnum)
        {
            if(ptarg)
                return;
            if(p_num>=1&&p_num<=ui->wdgSpinIter->maxValue())
                ui->wdgSpinIter->setCurrentValue(p_num);
        }
        else
           m_sett()->execBrowser(QUrl(url));
    }
}

void MPdfReader2::on_btLinksHide_clicked()
{
    ui->wdgLinks->hide();
}

double MPdfReader2::percentToDpi() const
{
    double const norm(0.72);

    switch(current_dpi_mode)
    {
    case Percent :
    {
        return current_dpi*norm;
        break;
    }
    case FitWidth :
    {
        QWidget * const wp(ui->iwPdfImg->drawarea()->viewport());
        double const psw(ppage->pageSizeF().width()),
                     psh(ppage->pageSizeF().height());

        double const iw(current_rot==Poppler::Page::Rotate0||current_rot==Poppler::Page::Rotate180?psw:psh),
                cw((double)wp->width()-ui->iwPdfImg->drawarea()->verticalScrollBar()->width());
        return (cw/iw)*(norm*100);
        break;
    }
    case FitHeight :
    {
        QWidget * const wp(ui->iwPdfImg->drawarea()->viewport());
        double const psw(ppage->pageSizeF().width()),
                     psh(ppage->pageSizeF().height());

        double const ih(current_rot==Poppler::Page::Rotate90||current_rot==Poppler::Page::Rotate270?psw:psh),
                ch((double)wp->height()-ui->iwPdfImg->drawarea()->horizontalScrollBar()->height());
        return (ch/ih)*(norm*100);
        break;
    }
    }

    return norm*100;
}

void MPdfReader2::on_btRefreshZoom_clicked()
{
    int const v(ui->wdgSpinIter->currentValue()-1);
    if(v>=0)
        showPage(v,true);
}

double MPdfReader2::setCurPercent(int side)
{
    double dw(ppage->pageSizeF().width()),
            cw((double)side),
            cp(cw/(dw/100));
    return setCurrentDpi(cp);
}

void MPdfReader2::setCurRotation(Poppler::Page::Rotation rotation)
{
    current_rot=rotation;
    switch(current_rot)
    {
    case Poppler::Page::Rotate0 :
        _sbwdg.setRotValue("+ 0 deg");
        break;
    case Poppler::Page::Rotate90 :
        _sbwdg.setRotValue("+ 90 deg");
        break;
    case Poppler::Page::Rotate180 :
        _sbwdg.setRotValue("+ 180 deg");
        break;
    case Poppler::Page::Rotate270 :
        _sbwdg.setRotValue("+ 270 deg");
        break;
    }
}

void MPdfReader2::on_btHideFind_clicked()
{
    ui->wdgFind->hide();
    _fbutt.setChecked(false);
}

void MPdfReader2::on_wdgScrInp_textChanged(const QString & text)
{
    on_cmbSearch_editTextChanged(text);
}

void MPdfReader2::on_cmbSearch_editTextChanged(const QString & arg1)
{
    bool const b=arg1.isEmpty();
    ui->btAll->setEnabled(!b);
    if(b)
        ui->wdgButtons->setEnabled(false);
    if(ui->btHighlight->isChecked())
        highlightAll();
}

void MPdfReader2::slot_iwImg_resizeRequested(bool smaller)
{
    int const v(smaller?-10:10);
    double const newv(current_dpi+v);
    if(newv>=_spnPercent.minimum()&&newv<=_spnPercent.maximum())
    {
        setCurrentDpi(newv);
        current_dpi_mode=Percent;
        on_btRefreshZoom_clicked();
    }
}

void MPdfReader2::on_actionGk_Lat_dictionary_triggered()
{
    if(!_gk)
    {
        _gk=new CLSJ(m_msg());
        ui->wdgHeader->initPage(MDocHeader::GkDict,ui->stwPdf->addWidget(_gk));
    }
    ui->wdgHeader->setDocMode(MDocHeader::GkDict);
}

void MPdfReader2::on_actionCoptic_dictionary_triggered()
{
    if(!_cop)
    {
        _cop=new CWordPreview(m_msg());
        ui->wdgHeader->initPage(MDocHeader::CopDict,ui->stwPdf->addWidget(_cop));
    }
    ui->wdgHeader->setDocMode(MDocHeader::CopDict);
}

void MPdfReader2::on_action_Hebrew_dictionary_triggered()
{
    if(!_heb)
    {
        _heb=new MHebrDict();
        ui->wdgHeader->initPage(MDocHeader::HebDict,ui->stwPdf->addWidget(_heb));
    }
    ui->wdgHeader->setDocMode(MDocHeader::HebDict);
}

void MPdfReader2::on_action_numeric_converter_triggered()
{
    if(!_num)
    {
        _num=new MCopticNumerals(0,true);
        ui->wdgHeader->initPage(MDocHeader::NumConv,ui->stwPdf->addWidget(_num));
    }
    ui->wdgHeader->setDocMode(MDocHeader::NumConv);
}

void MPdfReader2::on_actionClose_triggered()
{
    close();
}

void MPdfReader2::slot_fbutt(bool checked)
{
    ui->wdgHeader->setDocMode();
    ui->wdgFind->setVisible(checked);
}

void MPdfReader2::on_actionFind_triggered(bool checked)
{
    ui->wdgHeader->setDocMode();
    ui->wdgFind->setVisible(checked);
    _fbutt.setChecked(checked);
}

void MPdfReader2::on_actionToolbar_triggered(bool checked)
{
    ui->wdgHeader->setDocMode();
    ui->tbarTools->setVisible(checked);
}

void MPdfReader2::on_btHighlight_clicked(bool checked)
{
    if(checked)
    {
        switch(ui->stwInp->currentIndex())
        {
        case 0 :
            CLatCopt::updateHistory(ui->cmbSearch);
            break;
        case 1 :
            ui->wdgScrInp->updateHistory();
            break;
        }
        highlightAll();
    }
    else
    {
        clearItemsOnPage();
        ui->wdgButtons->setEnabled(false);
    }
}

void MPdfReader2::on_btInpMode_clicked(bool checked)
{
    if(checked)
    {
        ui->stwInp->setCurrentIndex(0);
        on_cmbSearch_editTextChanged(ui->cmbSearch->currentText());
    }
    else
    {
        ui->stwInp->setCurrentIndex(1);
        on_wdgScrInp_textChanged(ui->wdgScrInp->text_utf8());
    }
}

void MPdfReader2::on_tbAppearanceHide_clicked()
{
    ui->wdgPdfSett->hide();
}

void MPdfReader2::on_actionAppearance_triggered(bool checked)
{
    ui->wdgHeader->setDocMode();
    ui->wdgPdfSett->setVisible(checked);
}

void MPdfReader2::on_actionSave_as_text_triggered()
{
    QFileDialog fd(this,tr("save as text"),QString(),"text files (*.txt);;all files (*)");
    fd.setFileMode(QFileDialog::AnyFile);
    fd.setAcceptMode(QFileDialog::AcceptSave);
    fd.setDefaultSuffix("txt");
    if(fd.exec()==QDialog::Accepted)
    {
        if(fd.selectedFiles().count()>0)
        {
            QString fn(fd.selectedFiles().first());
            QFile f(fn);
            if(f.open(QIODevice::WriteOnly))
            {
                if(pdfText.isEmpty())
                    loadPdfText();
                int e;
                e=f.write(pdfText.join("\n\n").toUtf8());

                if(e==-1)
                    m_msg()->MsgErr(tr("cannot write into file '")+f.fileName()+"'");
                else
                {
                    m_msg()->MsgInf(QString(tr("file '")+f.fileName()+tr("' saved")));
                    m_msg()->MsgOk();
                }
                f.close();
            }
            else
                m_msg()->MsgErr(tr("cannot open file '")+f.fileName()+tr("' for writing"));
        }
    }
}

void MPdfReader2::on_actionAdd_bookmark_triggered()
{
    ui->wdgHeader->setDocMode();

    int const s(ui->wdgSpinIter->currentValue());
    bool exist=false;
    for(int x=0;x<_bm_menu.actions().count();x++)
    {
        QAction * const ai(_bm_menu.actions().at(x));
        if(ai->data().toInt()==s)
        {
            exist=true;
            break;
        }
    }

    if(!exist)
    {
        int const i(_bm_menu.actions().count());
        QAction * a=_bm_menu.addAction(tr("page ")+QString::number(s));
        QAction * arm=_bmrm_menu.addAction(tr("page ")+QString::number(s));
        a->setData(QVariant(s));
        arm->setData(QVariant(s));
        if(i<9)
        {
            QString const ks("Ctrl+Alt+"+QString::number(i+1));
            a->setShortcut(QKeySequence(ks));
            a->setShortcutContext(Qt::WindowShortcut);
            ui->statusBar->showMessage(tr("bookmark on page ")+QString::number(s)+" ("+ks+tr(") created"),5000);
        }
        else
            ui->statusBar->showMessage(tr("bookmark on page ")+QString::number(s)+tr(" created"),5000);
        _bm_menu.setEnabled(true);
        _bmrm_menu.setEnabled(true);
        ui->tbBookmarks->setEnabled(true);
        ui->lblBm->setText(QString::number(_bm_menu.actions().count()));
    }
    else
        ui->statusBar->showMessage(tr("! bookmark on page ")+QString::number(s)+tr(" exists already"),5000);
}

void MPdfReader2::on_actionDrop_all_triggered()
{
    ui->wdgHeader->setDocMode();

    _bm_menu.clear();
    _bm_menu.setEnabled(false);
    _bmrm_menu.clear();
    _bmrm_menu.setEnabled(false);

    ui->lblBm->setText("0");
    ui->tbBookmarks->setEnabled(false);
    ui->statusBar->showMessage(tr("all bookmarks dropped"),5000);
}

void MPdfReader2::on_tbBookmarks_clicked(bool checked)
{
    if(checked)
    {
        _bm_menu.setButton(ui->tbBookmarks);
        _bm_menu.exec();
    }
}

void MPdfReader2::tocBranch(QDomElement pe, QTreeWidgetItem * p, QList<MPdfTOCDestItem*> & toc_list)
{
    QDomElement e=pe.firstChildElement();
    while(!e.isNull())
    {
        MPdfTOCDestItem * i=new MPdfTOCDestItem(e);
        toc_list.append(i);
        i->setText(0,e.tagName());
        p->addChild(i);
        tocBranch(e,i,toc_list);
        e=e.nextSiblingElement();
    }
}

void MPdfReader2::on_dwTOC_visibilityChanged(bool visible)
{
    ui->actionTable_of_contents->setChecked(visible);
}

void MPdfReader2::on_dwSR_visibilityChanged(bool visible)
{
    ui->actionSearch_results->setChecked(visible);
}

void MPdfReader2::on_actionTable_of_contents_triggered(bool checked)
{
    ui->dwTOC->setVisible(checked);
}

void MPdfReader2::on_actionSearch_results_triggered(bool checked)
{
    ui->dwSR->setVisible(checked);
}

void MPdfReader2::on_treeTOC_itemSelectionChanged()
{
    QList<QTreeWidgetItem*> l=ui->treeTOC->selectedItems();
    if(l.count()>0)
        on_treeTOC_itemDoubleClicked(l.first(),0);
}

void MPdfReader2::on_treeTOC_itemDoubleClicked(QTreeWidgetItem *item, int )
{
    if(item)
    {
        MPdfTOCDestItem * i((MPdfTOCDestItem *)item);
        if(i->_pgnum>0)
        {
            ui->statusBar->showMessage(tr("accessing page ")+QString::number(i->_pgnum)+" ...",3000);
            ui->wdgSpinIter->setCurrentValue(i->_pgnum);
        }
        else if(i->_pgnum==-1)
        {
            USE_CLEAN_WAIT

            if(!i->_dest.isEmpty())
            {
                QStringList tocl(i->_dest.split(";",QString::KeepEmptyParts));
                if(tocl.count()>1)
                {
                    i->_pgnum=tocl.at(1).toInt();
                    if(i->_pgnum<-1)
                        i->_pgnum=-1;
                    else
                    {
                        ui->statusBar->showMessage(tr("target found at page ")+QString::number(i->_pgnum),5000);
                        ui->wdgSpinIter->setCurrentValue(i->_pgnum);
                        return;
                    }
                }
            }

            if(i->_pgnum==-1)
            {
                Poppler::LinkDestination * ld=pdfdoc->linkDestination(i->_dest_name);
                if(ld)
                {
                    i->_pgnum=ld->pageNumber();
                    ui->statusBar->showMessage(tr("target found at page ")+QString::number(i->_pgnum),5000);
                    delete ld;
                    ui->wdgSpinIter->setCurrentValue(i->_pgnum);
                    return;
                }
            }

            if(i->_pgnum<0)
            {
                i->_pgnum=-2;
                ui->statusBar->showMessage(tr("target '")+i->_dest_name+tr("' not found!"),5000);
            }
        }
        else
            ui->statusBar->showMessage(tr("unknown target!"),5000);
    }
}

void MPdfReader2::on_treeTOC_customContextMenuRequested(const QPoint &)
{
    QTreeWidgetItem * i=ui->treeTOC->currentItem();
    _a_goto->setEnabled(i);
    _a_expand->setEnabled(i);
    _a_collapse->setEnabled(i);

    QAction * a=_content_menu.exec(QCursor::pos());
    if(a)
    {
        if(a==_a_goto)
            on_treeTOC_itemDoubleClicked(i,0);
        else if(a==_a_expand)
        {
            if(i)
                ui->treeTOC->expandItem(i);
        }
        else if(a==_a_collapse)
        {
            if(i)
                ui->treeTOC->collapseItem(i);
        }
        else if(a==_a_expand_all)
            ui->treeTOC->expandAll();
        else if(a==_a_collapse_all)
            ui->treeTOC->collapseAll();
    }
}

//

MPdfTOCDestItem::MPdfTOCDestItem(QDomElement e)
    :QTreeWidgetItem(),
      _dest(e.attribute("Destination")),
      _dest_name(e.attribute("DestinationName")),
      _ext_name(e.attribute("ExternalFileName")),
      _open(e.attribute("Open")),
      _expand(QString::compare(_open,QString("true"),Qt::CaseInsensitive)==0),
      _pgnum(-1)
{
    QTreeWidgetItem::setText(0,e.tagName());
    QTreeWidgetItem::setToolTip(0,e.tagName());
}

//

CPdfTextItem1::CPdfTextItem1()
    : QTreeWidgetItem(QTreeWidgetItem::UserType),
    _rects()
{

}

//

CPdfTextItem2::CPdfTextItem2()
    : QTreeWidgetItem(QTreeWidgetItem::UserType),
    _rect()
{

}

CPdfTextItem2::~CPdfTextItem2()
{

}
